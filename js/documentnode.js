
        // =========================================================================
        // DOCUMENTNODE CLASS (Required for in-memory manipulation)
        // =========================================================================

        /**
         * Class designed to represent a node in a hierarchical document structure.
         */
        class DocumentNode {
            static _existingIds = new Set();
            
            constructor(id, name, content = [], children = [], parentId = null) {
                let cleanedId = id;
                if (DocumentNode._existingIds.has(cleanedId)) {
                    cleanedId = DocumentNode.getUniqueSequentialId(cleanedId);
                }
                DocumentNode._existingIds.add(cleanedId);

                this.id = cleanedId;
                this.name = name;
                this.content = Array.isArray(content) ? content : [content]; 
                this.children = Array.isArray(children) ? children : [];
                this.parentId = parentId;

                const parts = cleanedId.split('-');
                this.order = parseInt(parts[parts.length - 1], 10);
            }

            /**
             * Internal method to update the node's ID and order number, and recursively
             * fix all descendant IDs.
             */
            _recalculateId(parentId, newIndex) {
                DocumentNode._existingIds.delete(this.id);
                this.parentId = parentId;
                this.order = newIndex;

                if (parentId === null) {
                    this.id = newIndex.toString();
                } else {
                    this.id = `${parentId}-${newIndex}`;
                }

                DocumentNode._existingIds.add(this.id);
                this.reIndexChildren(); // Ensure all children's IDs are fixed relative to the new parent ID
            }

            /**
             * Re-indexes and re-IDs all children based on their current sequence in the 'children' array.
             * This MUST be called after any addition, deletion, or re-ordering of children.
             */
            reIndexChildren() {
                if (this.children.length === 0) return;

                // Sort children based on their current 'order' property before re-indexing
                this.children.sort((a, b) => a.order - b.order);

                this.children.forEach((child, index) => {
                    const newIndex = index + 1;
                    child._recalculateId(this.id, newIndex); 
                });
            }

            /**
             * Implements the 'Add Child' action.
             */
            addChild(name, content) {
                const nextOrder = this.children.length + 1;
                const newChildId = this.id === null ? nextOrder.toString() : `${this.id}-${nextOrder}`;

                const newChild = new DocumentNode(newChildId, name, content, [], this.id);
                this.children.push(newChild);
                
                this.reIndexChildren(); // Ensure sequential IDs are correct
                
                return newChild;
            }
            
            // --- ITERATION 1 CHANGE: DocumentNode Renaming Logic (1/5)
            /*****************************************************************************
             * NEW FUNCTIONALITY: RENAMING SUPPORT (Used for inline editing)
             *****************************************************************************/
            /**
             * Implements the 'Rename' action. Crucial for inline editing.
             */
            rename(newName) {
                this.name = newName;
            }
            /*****************************************************************************/

            /**
             * Implements the 'Delete' action. Called on the PARENT of the node to be deleted.
             */
            deleteChild(childIdToDelete) {
                const initialLength = this.children.length;

                this.children = this.children.filter(child => {
                    if (child.id === childIdToDelete) {
                        DocumentNode.deleteIdsRecursively(child); 
                        return false; 
                    }
                    return true;
                });

                if (this.children.length < initialLength) {
                    this.reIndexChildren();
                    return true;
                }
                return false;
            }
            
            // --- ITERATION 1 CHANGE: DocumentNode Deletion Helper (2/5)
            /*****************************************************************************
             * HELPER FUNCTION FOR DELETION (Removes IDs from the global set)
             *****************************************************************************/
            /**
             * Helper function to remove a node's ID and all descendant IDs from the global set.
             */
            static deleteIdsRecursively(node) {
                if (!node) return;
                DocumentNode._existingIds.delete(node.id);
                node.children.forEach(child => DocumentNode.deleteIdsRecursively(child));
            }
            /*****************************************************************************/
            
            // --- ITERATION 1 CHANGE: DocumentNode Sorting/Reparenting Logic (3/5)
            /*****************************************************************************
             * NEW FUNCTIONALITY: SORTING & RE-PARENTING LOGIC (Used for drag-and-drop)
             *****************************************************************************/
            /**
             * The crucial new method for Drag-and-Drop / Re-parenting.
             * This handles the complex array manipulation and ID fixing necessary for moving nodes.
             * * @param {string} movedNodeId The ID of the node being moved.
             * @param {string | null} newParentId The ID of the target parent node (null for root).
             * @param {number} newIndex The 0-based index where the node should be inserted into the new parent's children array.
             */
            static moveNode(movedNodeId, newParentId, newIndex) {
                // 1. Find the moved node and its original parent
                const movedNode = DocumentNode.searchMultipleRootsById(selfContainedDocument.document, movedNodeId);
                if (!movedNode) {
                    console.error("Move failed: Moved node not found.");
                    return false;
                }

                const oldParent = findParentNode(selfContainedDocument.document, movedNodeId);
                const newParent = newParentId === null 
                    ? selfContainedDocument.document // New parent is the root array
                    : DocumentNode.searchMultipleRootsById(selfContainedDocument.document, newParentId);

                if (!newParent) {
                    console.error("Move failed: New parent not found.");
                    return false;
                }
                
                // Prevent moving a node into itself or its own descendant
                if (newParentId === movedNodeId) {
                    console.warn("Cannot move a node into itself.");
                    return false;
                }
                // (More robust descendant check needed in a full implementation, but simplified for now)

                // 2. Remove node from old parent/array
                let childrenArrayOld = Array.isArray(oldParent) ? oldParent : oldParent.children;
                const oldIndex = childrenArrayOld.findIndex(node => node.id === movedNodeId);
                if (oldIndex === -1) {
                    console.error("Move failed: Node not found in old parent's children array.");
                    return false;
                }
                const [removedNode] = childrenArrayOld.splice(oldIndex, 1);
                
                // 3. Insert node into new parent/array
                let childrenArrayNew = Array.isArray(newParent) ? newParent : newParent.children;
                // Clamp index to prevent out-of-bounds error
                const clampedIndex = Math.min(newIndex, childrenArrayNew.length); 
                childrenArrayNew.splice(clampedIndex, 0, removedNode);

                // 4. Re-index: Fix IDs in both the old and new subtrees
                
                // Fix old parent siblings' IDs
                if (Array.isArray(oldParent)) {
                    // Re-index all root nodes (if the old parent was the root array)
                    oldParent.forEach((root, idx) => root._recalculateId(null, idx + 1));
                } else {
                    oldParent.reIndexChildren(); 
                }
                
                // Fix new parent children's IDs (and recursively fix the moved node's descendants)
                if (Array.isArray(newParent)) {
                    // Re-index all root nodes (if the new parent is the root array)
                    newParent.forEach((root, idx) => root._recalculateId(null, idx + 1));
                } else {
                    newParent.reIndexChildren();
                }

                return true;
            }
            /*****************************************************************************/


            // --- Search Utility (Searches across all root nodes) ---
            static searchMultipleRootsById(roots, targetId) {
                if (!Array.isArray(roots) || !targetId) return null;
                
                const findNode = (node, id) => {
                    if (node.id === id) return node;
                    for (const child of node.children) {
                        const found = findNode(child, id);
                        if (found) return found;
                    }
                    return null;
                };

                for (const root of roots) {
                    const found = findNode(root, targetId);
                    if (found) return found;
                }
                return null;
            }
            
            // --- Serialization/Deserialization & Utility Methods ---
            toJSON() {
                return {
                    id: this.id,
                    name: this.name,
                    content: this.content,
                    parentId: this.parentId,
                    children: this.children.map(child => child.toJSON())
                };
            }
            static fromJSON(jsonNode, parentId = null) {
                const node = new DocumentNode(
                    jsonNode.id,
                    jsonNode.name,
                    jsonNode.content || [],
                    [],
                    parentId
                );
                if (Array.isArray(jsonNode.children)) {
                    node.children = jsonNode.children.map(childJson => {
                        return DocumentNode.fromJSON(childJson, node.id);
                    });
                }
                node.reIndexChildren();
                return node;
            }
            static getUniqueSequentialId(baseId) {
                let newId = baseId;
                let iteration = 1;
                while (DocumentNode._existingIds.has(newId)) {
                    newId = `${baseId}_${iteration}`;
                    iteration++;
                    if (iteration > 1000) throw new Error("ID generation failure.");
                }
                return newId;
            }
        }


    // Export the class
    export default DocumentNode;