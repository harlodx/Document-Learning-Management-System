/*
// =========================================================================
// TO DO: CUSTOM CONTEXT MENU INTEGRATION (SIMPLIFIED)
// -------------------------------------------------------------------------
// OVERVIEW:
// We are connecting the custom right-click menu to the SectionNode data structure.
// This allows users to modify the document hierarchy (add/rename/delete sections) 
// directly from the nested list. Every successful change must update the in-memory 
// data, refresh the visual list (DOM), and create a new patch for version control.
// =========================================================================


// 1. FRONT-END BINDING & CONTEXT
// --------------------------------------------------------------------------

// [ ] Write a recursive 'findNodeById' function to locate any SectionNode object.

// [ ] Re-Bind the 'contextmenu' event listener specifically to the list links 
//     (.section-heading-link) and capture the target node's ID.

// [ ] Use the captured ID and 'findNodeById' to set the custom menu's title 
//     (e.g., "Options for: [Section Name]").


// 2. DATA MANIPULATION ACTIONS
// --------------------------------------------------------------------------

// [ ] Implement the 'Add Child' handler: Locate the parent node and call its 'addChild()' method.

// [ ] Implement the 'Rename' handler: Locate the target node and update its 'name' property.

// [ ] Implement the 'Delete' handler: Locate the target node's parent array and remove the node from it.


// 3. SYNCHRONIZATION & HISTORY
// --------------------------------------------------------------------------

// [ ] After ANY data modification, call 'renderDocumentStructure()' to redraw the nested list.

// [ ] After successful redraw, call 'saveDocument()' to generate a JSON patch and 
//     persist the new version to the document's history.
*/

////----------------------------------CUSTOM CONTEXT MENU OVERRIDE ENDS--------------------------------------////




// =========================================================================
// TO DO: SELF-CONTAINED JSON VERSION CONTROL IMPLEMENTATION
//
// NOTE: This implementation requires a JSON Patch library (e.g., fast-json-patch)
// to generate and apply the differential patches (deltas).
// =========================================================================

/*
-----------------------------------------------------------------------------
STEP 1: INITIAL SETUP & HYDRATION
-----------------------------------------------------------------------------
1.  [ ] **Persistence Layer**: Implement a function to load the 'selfContainedDocument' 
    (the full JSON string) from Firestore or local storage on app load.
2.  [ ] **Initial State**: If no saved data exists, initialize 'selfContainedDocument'
    with the 'document' structure set to 'initialDocumentStructure' and an empty 'history' array.
3.  [ ] **Hydration**: When loading the document, consider writing a recursive function
    to convert the plain objects in the loaded JSON back into 'SectionNode' class instances 
    if you need to use the class methods (like node.addChild()).

-----------------------------------------------------------------------------
STEP 2: THE SAVE OPERATION (Generating a New Version)
-----------------------------------------------------------------------------
1.  [ ] **Get Previous State**: Store a deep clone of the 'selfContainedDocument.document' 
    (the old version) *before* the user's latest edits are applied.
2.  [ ] **Generate Patch**: Use the JSON Patch library's `compare` or `generatePatch` function
    to find the difference between the 'old version' and the 'new version'.
    (Example: const patch = jsonpatch.compare(oldDoc, newDoc);)
3.  [ ] **Update History**: Create a new history object:
    - Increment 'metadata.currentVersion'.
    - Set 'timestamp' to now.
    - Set 'patch' to the generated array of changes.
    - Push this new history object into 'selfContainedDocument.history'.
4.  [ ] **Persistence**: Save the entire updated 'selfContainedDocument' object (as a JSON string) 
    back to your storage mechanism (e.g., Firestore).

-----------------------------------------------------------------------------
STEP 3: THE REVERT OPERATION (Restoring a Previous Version)
-----------------------------------------------------------------------------
1.  [ ] **Create Revert Function**: Write a function `revertToVersion(targetVersion)` that:
    - **Starts at Current State**: Clones the current 'selfContainedDocument.document'.
    - **Determines Patches to Undo**: Identifies all patches in the 'history' array from 
      `targetVersion + 1` up to `metadata.currentVersion`.
    - **Apply Reverse Patch**: For each patch in the determined range, apply its reverse
      to the current document clone using the JSON Patch library's `applyPatch` function, 
      effectively undoing the changes in reverse chronological order.
    - **Update Document**: Set the result of the reverse patching as the new 
      'selfContainedDocument.document'.
    - **Update Metadata**: Change 'metadata.currentVersion' to the `targetVersion`.
    - **Cleanup History**: Optional but recommended: remove all patch entries from the
      'history' array that are newer than the target version (since they are now obsolete).
    - **Re-Render**: Call your existing `renderDocumentStructure()` function to update the DOM.
*/

/**
 * Suggest that we redo the DocumentNode class to handle the full functionality for this page. See below:
 */


// /**
//  * Class designed to represent a node in a hierarchical document structure.
//  * Includes methods for robust JSON loading, saving, and automatic re-indexing 
//  * to support user editing and reordering in a web environment.
//  * * NOTE: This version uses explicit 'if...else' statements instead of conditional shorthand 
//  * for improved readability and learning.
//  */
// class DocumentNode {
//     // STATIC PROPERTY: Global registry of IDs for uniqueness checking.
//     static _existingIds = new Set();

//     // --- Core Constructor ---

//     /**
//      * Constructs a new DocumentNode instance. 
//      * NOTE: 'order' is always derived from the last segment of the ID.
//      * @param {string} id - The unique identifier (e.g., '1', '1-2').
//      * @param {string} name - The title or heading for this node.
//      * @param {string} content - The main body text for this node.
//      * @param {DocumentNode[]} [children=[]] - An array of nested DocumentNode instances.
//      * @param {string|null} [parentId=null] - The ID of the parent node.
//      */
//     constructor(id, name, content, children = [], parentId = null) {
//         if (typeof id !== 'string' || id.length === 0) {
//             throw new Error(`[ID Error] ID is required and must be a non-empty string.`);
//         }

//         let cleanedId = id.replace(/[^\d-]/g, '');
//         const idRegex = /^[\d]+(-[\d]+)*$/; 

//         if (!idRegex.test(cleanedId)) {
//             // This is primarily an issue during initial manual construction or data corruption.
//             throw new Error(`[ID Error] ID format is invalid: ${id}`);
//         }

//         // --- ID Validation & Registration ---
//         if (DocumentNode._existingIds.has(cleanedId)) {
//             // Only necessary if the ID was manually created or a conflict occurred during auto-gen.
//             cleanedId = DocumentNode.getUniqueSequentialId(cleanedId);
//         }
//         DocumentNode._existingIds.add(cleanedId);

//         // --- Assignment ---
//         this.id = cleanedId;
//         this.name = name;
//         this.content = content;

//         // Use full if structure for children check
//         if (Array.isArray(children)) {
//             this.children = children;
//         } else {
//             this.children = [];
//         }

//         this.parentId = parentId;

//         // The 'order' (local index) is derived from the last number segment of the ID.
//         const parts = cleanedId.split('-');
//         this.order = parseInt(parts[parts.length - 1], 10);
//     }

//     // --- STATIC Methods for Data Flow ---

//     /**
//      * Factory method to recursively build the DocumentNode tree from a raw JSON object.
//      * @param {object} jsonNode - The raw JSON data for a single node.
//      * @param {string|null} [parentId=null] - The parent's ID during recursion.
//      * @returns {DocumentNode} A fully instantiated DocumentNode.
//      */
//     static fromJSON(jsonNode, parentId = null) {
//         if (!jsonNode.id || !jsonNode.name || jsonNode.content === undefined) {
//              throw new Error("Invalid JSON structure: Node must have id, name, and content.");
//         }

//         // Create the node (the constructor handles ID registration)
//         const node = new DocumentNode(
//             jsonNode.id,
//             jsonNode.name,
//             jsonNode.content,
//             [], // Children will be populated recursively
//             parentId
//         );

//         // Recursively hydrate children
//         if (Array.isArray(jsonNode.children)) {
//             // Using map with an explicit return statement for clarity
//             node.children = jsonNode.children.map(childJson => {
//                 return DocumentNode.fromJSON(childJson, node.id);
//             });
//         }
        
//         // After hydrating the whole tree, re-index to ensure order/ID coherence
//         node.reIndexChildren(); 

//         return node;
//     }

//     /**
//      * Standard JavaScript method used by JSON.stringify() to control serialization.
//      * @returns {object} A plain object containing only the necessary data for saving.
//      */
//     toJSON() {
//         // Recursively convert children to plain objects
//         const childrenJSON = this.children.map(child => {
//             return child.toJSON();
//         });
        
//         return {
//             id: this.id,
//             name: this.name,
//             content: this.content,
//             children: childrenJSON,
//         };
//     }

//     // --- Instance Methods for Hierarchy Management ---

//     /**
//      * Recalculates the IDs and 'order' for this node and its entire subtree.
//      * @param {string} parentId - The new ID of the parent.
//      * @param {number} newIndex - The new sequential index (e.g., 3 if it's the 3rd child).
//      */
//     _recalculateId(parentId, newIndex) {
//         // 1. Remove old ID from global set
//         DocumentNode._existingIds.delete(this.id);

//         // 2. Determine new ID and parentId
//         this.parentId = parentId;
//         this.order = newIndex;

//         // Replacing ternary: this.id = parentId === null ? newIndex.toString() : `${parentId}-${newIndex}`;
//         if (parentId === null) {
//             this.id = newIndex.toString();
//         } else {
//             this.id = `${parentId}-${newIndex}`;
//         }

//         // 3. Add new ID to global set
//         DocumentNode._existingIds.add(this.id);
        
//         // 4. Recursively update children
//         this.reIndexChildren();
//     }
    
//     /**
//      * Recalculates the IDs and 'order' properties for all direct children.
//      * This must be called after any reordering or removal of children.
//      */
//     reIndexChildren() {
//         if (this.children.length === 0) {
//             return;
//         }

//         // Ensure children are sorted by their current order before re-indexing.
//         // Using explicit if/else logic in the comparison function for clarity.
//         this.children.sort((a, b) => {
//             if (a.order < b.order) {
//                 return -1;
//             } else if (a.order > b.order) {
//                 return 1;
//             } else {
//                 return 0;
//             }
//         });

//         this.children.forEach((child, index) => {
//             const newIndex = index + 1; // 1-based indexing for order
            
//             // Recalculate this child's ID and all of its descendants
//             child._recalculateId(this.id, newIndex);
//         });
//     }

//     /**
//      * Automatically calculates the next sequential ID for a new child node 
//      * based on the highest existing order.
//      * @returns {string} The next available hierarchical ID.
//      */
//     getAvailableChildId() {
//         if (this.children.length === 0) {
//             return `${this.id}-1`;
//         }
        
//         // Replacing the array.reduce() shorthand with a standard for loop
//         let highestOrder = 0;
        
//         for (let i = 0; i < this.children.length; i++) {
//             const child = this.children[i];
//             if (child.order > highestOrder) {
//                 highestOrder = child.order;
//             }
//         }

//         const nextOrder = highestOrder + 1;
        
//         return `${this.id}-${nextOrder}`;
//     }

//     /**
//      * Creates a new DocumentNode instance and adds it to this node's children.
//      * @param {string} name - The title or heading for the new child.
//      * @param {string} content - The body text for the new child.
//      * @returns {DocumentNode} The newly created child node.
//      */
//     addChild(name, content) {
//         const newChildId = this.getAvailableChildId();
        
//         const newChild = new DocumentNode(newChildId, name, content, [], this.id);
//         this.children.push(newChild);
        
//         // Sort children array by the 'order' property using explicit if/else
//         this.children.sort((a, b) => {
//             if (a.order < b.order) {
//                 return -1;
//             } else if (a.order > b.order) {
//                 return 1;
//             } else {
//                 return 0;
//             }
//         });
        
//         console.log(`\n➕ Child Added: Parent ID ${this.id} -> Child ID ${newChildId}`);
//         return newChild;
//     }
    
//     // --- Utility Methods (ID Management) ---
    
//     getDepth() {
//         return this.id.split('-').length;
//     }
    
//     // Fallback for ID conflicts (using full if/else for variable assignment)
//     static getUniqueSequentialId(baseId) {
//         let newId = baseId;
//         let iteration = 1;
        
//         // Match the last segment: (.*-) is prefix, (\d+)$ is the number
//         const match = baseId.match(/(.*-)(\d+)$/);
        
//         let prefix = '';
//         let lastSegment = 0; // Default initialization

//         // Use full if...else structure to determine prefix and lastSegment
//         if (match) {
//             prefix = match[1]; 
//             lastSegment = parseInt(match[2], 10);
//         } else {
//             // If no hyphen, the baseId itself is the last segment
//             lastSegment = parseInt(baseId, 10);
//         }
        
//         while (DocumentNode._existingIds.has(newId)) {
//             const nextSegment = lastSegment + iteration;
//             newId = `${prefix}${nextSegment}`;
            
//             if (iteration > 1000) {
//                  throw new Error(`[ID Generation Error] Could not find a unique ID after 1000 attempts starting from ${baseId}.`);
//             }
//             iteration++;
//         }
//         return newId;
//     }
// }

// // --- Demonstration of Re-indexing and JSON Workflow ---

// console.log('--- Creating an initial document structure ---');
// // Clear IDs for the demo
// DocumentNode._existingIds.clear(); 

// const root = new DocumentNode('1', 'Project Document', 'Root content.');
// const secA = root.addChild('Section A: Initial', 'Content A'); // ID 1-1
// const secB = root.addChild('Section B: Initial', 'Content B'); // ID 1-2
// const subB1 = secB.addChild('Sub-Section B1', 'Content B1');  // ID 1-2-1
// const secC = root.addChild('Section C: Initial', 'Content C'); // ID 1-3

// console.log('--- 1. Initial Structure ---');
// console.log(JSON.stringify(root.toJSON(), null, 2));

// // --- SIMULATING USER DRAG AND DROP (Reordering) ---

// console.log('\n--- 2. SIMULATING REORDER: Moving Section C (1-3) before Section A (1-1) ---');

// // We find the objects to manipulate
// const sectionC = root.children.find(child => {
//     if (child.id === '1-3') {
//         return true;
//     }
//     return false;
// });
// const sectionA = root.children.find(child => {
//     if (child.id === '1-1') {
//         return true;
//     }
//     return false;
// });

// // Physical reordering of the array elements
// root.children.splice(root.children.indexOf(sectionC), 1);
// root.children.splice(0, 0, sectionC);

// // The IDs are now INCORRECT (C is still 1-3, A is still 1-1)
// console.log(`Array order (before re-index): ${root.children.map(c => c.id)}`);

// // --- 3. RE-INDEXING THE HIERARCHY ---
// root.reIndexChildren();

// console.log(`Array order (after re-index): ${root.children.map(c => c.id)}`);

// // Now Section C is 1-1, Section A is 1-2, and Section B's children have been updated (1-3-1)
// console.log('\n--- 4. Final Structure after Re-indexing ---');
// // Log the new JSON structure to confirm IDs are updated (1-1, 1-2, 1-3, 1-3-1)
// const finalJson = JSON.stringify(root.toJSON(), null, 2);
// console.log(finalJson);

// // --- SIMULATING LOADING FROM JSON (Hydration) ---

// console.log('\n--- 5. SIMULATING LOADING: Hydrating new Root2 from the Final JSON ---');
// DocumentNode._existingIds.clear(); // Clear IDs for a clean load simulation

// const root2 = DocumentNode.fromJSON(JSON.parse(finalJson));

// console.log(`Root 2 ID: ${root2.id}, Name: ${root2.name}`);

// if (root2.children.length > 0) {
//     console.log(`First child of Root 2 ID: ${root2.children[0].id}`); // Should be 1-1 (Section C)
// } else {
//     console.log('Root 2 has no children.');
// }

// if (root2.children[2] && root2.children[2].children.length > 0) {
//     console.log(`Sub-Section B1's ID: ${root2.children[2].children[0].id}`); // Should be 1-3-1
// } else {
//     console.log('Sub-Section B1 not found or has no children.');
// }

///// NEW CLASS BUILD ENDS HERE /////



// Define classes for Document Elements

/*
* Class representing a node in a recursive tree structure.
* This structure should allow for inifinite nesting.
*/
class DocumentNode {

  // STATIC PROPERTIES:
  // Tracks all IDs successfully assigned across all instances.
  static _existingIds = new Set();
  // Tracks all live DocumentNode instances. Used for assigning order.
  static _instances = new Map();

  // --- Core ID Generation and Validation Methods ---

  /**
   * Helper function to handle natural sorting (e.g., '1-10' comes after '1-2').
   * It splits the IDs by hyphens and compares each segment numerically.
   * @param {string} idA - The first ID string.
   * @param {string} idB - The second ID string.
   * @returns {number} Standard comparison value (-1, 0, 1).
   */
  static _naturalSortComparator(idA, idB) {
    const partsA = idA.split('-');
    const partsB = idB.split('-');
    const maxLength = Math.max(partsA.length, partsB.length);

    for (let i = 0; i < maxLength; i++) {
      // Use 0 if a part doesn't exist (e.g., comparing '1' to '1-1')
      const numA = parseInt(partsA[i] || 0, 10);
      const numB = parseInt(partsB[i] || 0, 10);

      if (numA < numB) return -1;
      if (numA > numB) return 1;
    }
    return 0;
  }


    /**
     * Resolves a potential duplicate ID by incrementing the last numeric segment.
     * If the original ID is '123-456', it will try '123-457', '123-458', etc.
     * @param {string} baseId - The ID that was found to be a duplicate.
     * @returns {string} The first available unique ID.
     */
    static getUniqueSequentialId(baseId) {
        let newId = baseId;
        let iteration = 1;
        // Regex: /(.*-)(\d+)$/
        const match = baseId.match(/(.*-)(\d+)$/);

        let prefix;
        let lastSegment;

        // --- 1. Determine Prefix and Last Segment ---

        if (match) {
            // ID has a prefix (e.g., '123-456')
            prefix = match[1];
            lastSegment = parseInt(match[2], 10);
        } else {
            // ID is a single numeric block (e.g., '99999')
            prefix = '';
            lastSegment = parseInt(baseId, 10);
        }

        // --- 2. Loop and Increment until Unique ---

        // Keep incrementing until a unique ID is found in the static Set
        while (DocumentNode._existingIds.has(newId)) {
            // Calculate the next segment value
            const nextSegment = lastSegment + iteration;
            // Construct the new ID by rejoining the prefix and the incremented segment
            newId = `${prefix}${nextSegment}`;

            // Safety check to prevent infinite loops (e.g., if IDs were non-numeric)
            if (iteration > 1000) {
                 throw new Error(`[ID Generation Error] Could not find a unique ID after 1000 attempts starting from ${baseId}.`);
            }

            iteration++;
        }

        return newId;
    }

  // --- Static Methods for Instance Management ---

  /**
   * **MANDATORY HELPER FUNCTION**
   * Checks all currently tracked instances, sorts them based on their
   * hierarchical ID structure (1-1, 1-2, 1-10), and assigns a sequential
   * `.order` number (starting from 1) to each live object.
   */
  static recalculateOrder() {
    if (DocumentNode._instances.size === 0) {
      console.log('Order Recalculation Skipped: No instances to order.');
      return;
    }

    console.log('\n--- STARTING ORDER RECALCULATION (DocumentNode) ---');

    // 1. Get all currently used IDs
    const ids = Array.from(DocumentNode._instances.keys());

    // 2. Sort them hierarchically using the custom comparator
    ids.sort(DocumentNode._naturalSortComparator);

    // 3. Assign the new sequential order property to the live objects
    ids.forEach((id, index) => {
      const instance = DocumentNode._instances.get(id);
      if (instance) {
        // The .order property is 1-based (Order 1, Order 2, etc.)
        instance.order = index + 1;
        console.log(`[Order Update] ID: ${id} assigned Order: ${instance.order}`);
      }
    });

    console.log('--- ORDER RECALCULATION COMPLETE ---');
  }

    /**
     * Releases a specific ID, removing it from the global tracker.
     * This makes the ID available for reuse by future CodeValidator instances (Hole-Filling).
     * * NOTE ON RE-SEQUENCING (Hole Closing): 
     * We cannot automatically re-sequence or "promote" subsequent IDs (e.g., change 
     * '123-457' to '123-456') from this static manager. Doing so would violate data 
     * integrity because the manager has no reference to the live objects or database 
     * records whose IDs would need to be surgically updated. The current approach 
     * ensures safe deletion and reuse.
     * * @param {string} id - The ID string to release.
     * @returns {boolean} True if the ID was found and released, false otherwise.
     */
    static releaseId(id) {
        // We use the Set.delete() method, which returns true if the element 
        // existed and was removed, or false if it was not found.
        const wasReleased = DocumentNode._existingIds.delete(id);
        const wasInstanceRemoved = DocumentNode._instances.delete(id);

        if (wasReleased || wasInstanceRemoved) {
            console.log(`🗑️ ID Released: ${id} is now available for reuse.`);
        } else {
            console.log(`⚠️ ID Release Warning: ${id} was not found in the tracker.`);
        }
        return wasReleased;
    }

  constructor(id, name, content, order = 0, children = []) {

    const originalId = id;
    
    if (typeof id != 'string' || id.length === 0) {
      throw new Error(`[ID Error] ID is required and must be a non-empty string.`);
    }

    // 1. CLEANUP STEP: Remove all non-conforming characters.
    // The regex used here is: /[^\d-]/g
    // - [^\d-]: A **negated character set** (starting with ^). It matches any character that is 
    //   *NOT* a digit (\d) and *NOT* a hyphen (-).
    // - /g: The global flag, ensuring ALL occurrences are matched and replaced, not just the first one.
    // The characters found by this regex are replaced with an empty string (''), effectively deleting them.
    let cleanedId = id.replace(/[^\d-]/g, '');

    // Debug code to tell us when an ID was cleaned up
    if (cleanedId != id) {
      //debugMessage(`Changed improperly formatted ID ${id} to ${cleanedId}`);
    }


    // 2. FINAL VALIDATION REGEX: Ensure the cleaned string starts/ends correctly.
    // The Regular Expression: /^[\d]+(-[\d]+)*$/
    // This ensures the ID consists of alternating blocks of numbers and hyphens, 
    // starting and ending only with numbers.
    const idRegex = /^[\d]+(-[\d]+)*$/;
    /*
    * REGEX BREAKDOWN (for the strict validation regex): /^[\d]+(-[\d]+)*$/
    * * 1. Anchor: ^ - Matches the beginning of the string.
    * * 2. First Segment (Mandatory): [\d]+ - Requires the ID to begin with at least one number.
    * * 3. Repeating Segment (Optional): (-[\d]+)* - Allows subsequent segments (a hyphen followed by numbers).
    * * 4. Anchor: $ - Matches the end of the string.
    */


    if (!idRegex.test(cleanedId)){
      debugMessage(`Error, ID ${id} not valid`);
      //Throw data validation error
      throw new Error(`[ID Error] ID "${id}" was cleaned to "${cleanedId}", but the final format is invalid (must start and end with a number).`);
      
    } else {
      //debugMessage(`No Errors, ID ${cleanedId} is valid`);
    }

    // 3. DUPLICATE CHECK & RESOLUTION: 
    if (DocumentNode._existingIds.has(cleanedId)) {
      // Reassign the cleanedId to the new unique ID generated by the helper.
      cleanedId = DocumentNode.getUniqueSequentialId(cleanedId);
      console.log(`✅ Duplicate resolved. Original ID: ${originalId} -> Final ID: ${cleanedId}`);
    } else {
      console.log(`✅ Success: Cleaned ID: ${cleanedId} is unique.`);
    }

    // --- Assignment (Only runs if validation and resolution pass) ---

    // Register the unique ID in the static Set
    DocumentNode._existingIds.add(cleanedId);
    // Assignment of inputs
    this.id = cleanedId; // Use the cleaned and validated ID
    this.name = name;
    this.content = content;
    this.order = null;
    this.children = children; // Array of DocumentNode

    // Track the live instance
    DocumentNode._instances.set(this.id, this);

    // Recalculate the order for *all* objects after a new one is added
    DocumentNode.recalculateOrder();    
  }

  // Add a child
  addChild(childNode) {
    if (childNode instanceof DocumentNode) {
      this.children.push(childNode);
      this.children.sort((a, b) => a.order - b.order); // Maintain order
    } else {
      throw new Error("Child must be an instance of DocumentNode");
    }
  }

  // Remove a child by their id
  removeChildById(childId){
    const initialLength = this.children.length;

    this.children = this.children.filter(child => child.id != childId);

    return this.children.length < initialLength;
  }

  // Display a child as a string - Helper 
  displayChildren() {
    if (this,this.children.length === 0) return 'No children.';

    return this.children.map(child => `[${child.name} (${child.id})]`).join( ' | ');
  }

  /**
 * A helper method to display the current state.
 */
  displayInfo() {
    console.log(`\n--- Document Info ---`);
    console.log(`ID: ${this.id}`);
    console.log(`Description: ${this.description}`);
    console.log(`---------------------`);
  }
}


const debugMode = true; // Set to true to enable debug messages

// Debugging function - disable the const debugMode to turn off all debug messages
function debugMessage(message, data = []) {
  if (!debugMode) return false; // Exit if debug mode is off

  if (data[0] == undefined) {
    console.log("DEBUG:", message); // Log the debug message  
    return true;
  } else {
    console.log("DEBUG:", message, data); // Log the debug message
  }

  return true;
}


// TEST Data for Document Elements
// Level 3 (Deepest)
const node_1_1_1 = new DocumentNode(
  '1-1-1',
  'T 1.1.1',
  'List all necessary tools and access credentials.',
  15,
);

// Level 1.1
const node_1_1 = new DocumentNode(
  '1-1',
  'T 1.1',
  'Initial steps before starting the procedure.',
  14,
  // [node_1_1_1] // Contains node_1_1_1
);

//
const node_1_2 = new DocumentNode(
  '1-2',
  'T 1.2',
  'The main procedural steps.',
  13
);


// Duplicate Level 2 for testing re-parenting
const node_1_2b = new DocumentNode(
  '1-2',
  'T 1.2 Duplicate',
  'Citations and reference materials.',
  12
);

//
const node_1_2_2 = new DocumentNode(
  '1-2-2',
  'T 1.22',
  'The main procedural steps.',
  11
);


// Duplicate Level 2 for testing re-parenting
const node_1_2_2b = new DocumentNode(
  '1-2-2b',
  'T 1.22 Duplicate',
  'Citations and reference materials.',
  10
);

// Subsequent Level 2 for testing re-ordering of duplicates (1-2b should come after 1-3 after re-parenting -- or should become 1-3??)
const node_1_3 = new DocumentNode(
  '1-3',
  'T 1.3',
  'Citations and reference materials.',
  9
);

// Level 1 (The Root/Main Headings)
const node_1 = new DocumentNode(
  '1',
  'T 1',
  'Overview of the entire process.',
  8,
  [node_1_1, node_1_2] // Contains node_1_1 and node_1_2
);

const node_2 = new DocumentNode(
  '2',
  'T 2',
  'Checklist for final review.',
  7
);

const node_3 = new DocumentNode(
  '3',
  'T 3',
  'Supplementary information and resources.',
  6
);

// Level 3 under node_3 but with poor initial ID structure to test re-parenting
const node_3_1_1 = new DocumentNode(
  '3-1-1-1',
  'T 3.1.1.1',
  'Links to external resources and references.',
  5
);

// Another Level 2 under node_3 with poor initial ID structure to test re-parenting and ordering
const node_3_22 = new DocumentNode(
  '3-22',
  'T 3.22',
  'Extra documents and materials for reference.',
  4,

);

// Another Level 2 under node_3 with poor initial ID structure to test re-parenting and ordering
const node_3_22b = new DocumentNode(
  '3-22',
  'T 3.22b',
  'A duplicate ID',
  2,

);

// Another Level 2 under node_3 with poor initial ID structure to test re-parenting and ordering
const node_3_22c = new DocumentNode(
  '3-22',
  'T 3.22c',
  'A duplicate ID',
  1,

);


const flatNodeList = [
  node_3, // Intentionally out of order to test sorting
  node_1,
  node_1_3, // Subsequent duplicate to test ordering after re-parenting - see if it becomes 1-4(?)
  node_1_1,
  node_1_1_1,
  node_1_2, // Original
  node_1_2b, // Duplicate to test re-parenting / correction to an alternative order and id while maintaining name
  node_2,
  node_3_1_1, // Test re-parenting from 3-1-1-1 to 3-1
  node_3_22,  // Test re-parenting from 3-22 to 3-2
  node_3_22b,
  node_3_22c,
  node_1_2_2, // Original
  node_1_2_2b // Duplicate to test re-parenting / correction to an alternative order and id while maintaining name

];



function removeChildren(flatNodes) {
  // Test log each node's ID
  const nodeMap = new Map();  // Map to hold nodes by ID

  // First, create a map of all nodes by their IDs
  flatNodes.forEach(node => {

    // [ ] TODO error check for non-standard ID values: if anything doesn't conform to 1-1-1 (number hyphen number hyphen etc) try to correct if possible or throw an error - try not to destroy entries or throw errors. Just place them in a container for user to review maybe??

    
    /*
    * TODO - we need to handle children better
    *   They break the display rendering they are placed into the hierarchy (breaks out into a new section)
    * *
    * For now we're deleting the link to the child when loading in so that we can do a clean load.
    * 
    * 
    *
    */
    if (node.children.length > 0) {


      node.children.forEach(child => {
        console.log(`Child ID found: ${child.id}`);  //DEBUG LOG
        //const deletionStatus = node.removeChildById(child.id);

        

        if (!node.removeChildById(child.id)) {
          console.log(`    - Unable to disconnect child: ${child.id}`);
        }
        else {
          console.log(`    - disconnected child: ${child.id}`);
        }

      });
    } else {

      nodeMap.set(node.id, node);
      //debugMessage(`nodeMap set ${node.id} :`, node);
    }
  });

    return { nodeMap: nodeMap,
      flatNodes: flatNodes,
    };
} 



// A function that will take a flat array of nodes (not a matrix) and build the hierarchy based on the IDs (if they aren't already nested) (OLD WAY)
function buildHierarchy(flatNodes) {

  const nodeMap = new Map();
  const rootNodes = [];

  const removeChildrenOutput = removeChildren(flatNodes);
  flatNodes = removeChildrenOutput.flatNodes;
  

  // First, create a map of all nodes by their IDs
  flatNodes.forEach(node => {
      nodeMap.set(node.id, node);
  });


  // Then, iterate again to establish parent-child relationships
  flatNodes.forEach(node => {

    // Split the ID to determine parentage
    const idParts = node.id.split('-');

    // If there are multiple parts, we assume it has a parent (or should have one at least, we'll check for higher level parents if the immediate one isn't found)
    if (idParts.length > 1) {

      // This node has a parent - determine the parent ID
      const parentId = idParts.slice(0, -1).join('-');

      // Look up the parent node in the map
      const parentNode = nodeMap.get(parentId);
      // console.log(`Parent ID for node ${node.id} is ${parentId}`); //TEST LOG

      // If a parent node is found, add this node as its child
      if (parentNode) {
        parentNode.addChild(node);
      }

      // Else, if no parent node is found, we need to check for higher level parents
      else {

        // Check for a higher level parent
        let higherLevelParentId = null; // Initialize variable to hold higher level parent ID

        // Iterate backwards through the ID parts to find the nearest existing parent
        for (let i = idParts.length - 2; i > 0; i--) {
          higherLevelParentId = idParts.slice(0, i).join('-');  // Get the higher level parent ID
          const higherLevelParentNode = nodeMap.get(higherLevelParentId); // Look up the higher level parent node

          // console.log(`Checking for higher level parent ID: ${higherLevelParentId} for node ID: ${node.id}`); //TEST LOG

          // If found, add this node as its child and break the loop
          if (higherLevelParentNode) {
            //console.log(`Higher level parent ID for node ${node.id} is ${higherLevelParentId}`); //TEST LOG
            higherLevelParentNode.addChild(node); // Add as child to the higher level parent

            // Amend the node.id to reflect the new parentage
            node.id = higherLevelParentId + '-' + node.id.split('-').slice(-1);

            // Amend the id.order to reflect the new parentage
            node.order = higherLevelParentNode.order + (parseFloat(node.id.split('-').slice(-1)) * 0.1);  // Simple way to adjust order based on new parent
            break;  // Exit the loop once a parent is found
          }
        }

        // If still no parent found, treat as root
        if (!higherLevelParentId) {
          rootNodes.push(node); // Add to root nodes
          // console.log(`No parent found for node ID: ${node.id}. Added as root node.`); //TEST LOG
        }
      }
    }
    // No parent, this is a root node
    else {
      // console.log(`Node ID: ${node.id} is a root node.`); //TEST LOG
      rootNodes.push(node); // Add to root nodes
    }
  });



  /**
   * Then iterate again so that the root nodes are ordered consecutively according to closest prior formatting 
   * */
  rootNodes.sort((a, b) => a.order - b.order);  // Sort root nodes by order (calculated in the DocumentNode class)

  /*
  *At this point, all nodes should be properly nested. Now we need to ensure that all nodes (root and children) are numbered consecutively.
  */

  //Iterate through root nodes and their children to assign correct order and IDs
  rootNodes.forEach((node, index) => {
    node.order = index + 1; // Assign order starting from 1
    //console.log(`String Order for Root Node: ${node.order}`); //TEST LOG
    node.id = (index + 1).toString(); // Assign ID to be consecutive numbers as strings
  

    // Now handle children recursively
    function assignChildOrderAndIds(parentNode) {
      parentNode.children.sort((a, b) => a.order - b.order); // Sort children by order

      // Iterate through children to assign order and IDs
      parentNode.children.forEach((childNode, childIndex) => {
        // Convert parentNode.order to a string with decimal places based on depth
        const orderString = parentNode.order.toString() + '.' + (childIndex + 1).toString();

        /*
         * Build a new string where only the left-most decimal point is kept
         * (to avoid issues with multiple decimal points in a number),
         * bear in mind there might be significant decimal places already present beyond our test objects.
        */
        const orderParts = orderString.split('.');  // Split by decimal point
        childNode.order = parseFloat(orderParts[0] + '.' + orderParts.slice(1).join('')); // Rejoin all parts after the first decimal point

        // console.log(`String Order for Child Node: ${childNode.order}`); //TEST LOG

        childNode.id = parentNode.id + '-' + (childIndex + 1).toString(); // Assign ID based on parent
        // console.log(`  Assigned Child Node ID: ${childNode.id}, Order: ${childNode.order}, Name: ${childNode.name}`); //TEST LOG

        // Recursively assign for any sub-children
        if (childNode.children.length > 0) {
          assignChildOrderAndIds(childNode);  // Recursive call
        }
      } );
    }
    assignChildOrderAndIds(node); // Initial call for the current root node
  });



  debugMessage(`Nodes exist as follow: `, rootNodes);
  return rootNodes;
}

// const nodesOOP = buildHierarchyOOP(flatNodeList); //TODO - Replace this with actual data retrieval logic
const nodes = buildHierarchy(flatNodeList); //TODO - Replace this with actual data retrieval logic - TEMPORARILY DISABLED FOR OOP TESTING (OLD WAY)

// The final data structure is an array of the top-level nodes
// const documentStructure = [...nodesOOP]; // Used to populate the document structure (could be used for final code as it adds all elements within it to the system)
const documentStructure = [...nodes]; // Used to populate the document structure (could be used for final code as it adds all elements within it to the system)
//console.log(documentStructure); //Test log to verify structure



/*
* Recursive function to render the document structure into HTML
* @{DocumentNode[]} nodes - Array of DocumentNode to render.
* @{HTMLElement} container - The DOM element to append the <ol> to.
*/

function buildNestedList(nodes, parentElement) {
  // 1. Create the <ol> for the current level
  const orderedList = document.createElement('ul'); //was <ol>
  // orderedList.classList.add('sortable-list');

  // 2. Sort the nodes based on their order property
  nodes.sort((a, b) => a.order - b.order);

  // 3. Iterate through each node to create <li> elements
  nodes.forEach(node => {
    const listItem = document.createElement('li');
    listItem.classList.add('sortable-item');
    listItem.classList.add('list-container');
    listItem.setAttribute('draggable', 'true');

    // Create an anchor tag (<a>) for the clickable heading
    const sectionLink = document.createElement('div');
    sectionLink.setAttribute('data-section-id', node.id);
    sectionLink.classList.add('section-link');

    //sectionLink.setAttribute('clickable', 'true');

    //ID on the left, Name on the right
    const leftText = document.createElement('div');
    const lastHyphenIndex = node.id.lastIndexOf('-');

    // leftText.textContent = node.id;
    leftText.textContent = lastHyphenIndex !== -1 ? node.id.substring(lastHyphenIndex + 1) : node.id;
    leftText.classList.add('left-block');

    const rightText = document.createElement('div');
    rightText.textContent = node.name;
    rightText.classList.add('right-block');

    // Append left and right blocks to the section link
    sectionLink.appendChild(leftText);
    sectionLink.appendChild(rightText);

    // Append the link to the list item
    listItem.appendChild(sectionLink);

    //Check for children and recursively build their lists
    if (node.children && node.children.length > 0) {
      buildNestedList(node.children, listItem);
    };
    // Append the list item to the ordered list
    orderedList.appendChild(listItem);
  });

  // 4. Append the constructed ordered list to the parent element
  parentElement.appendChild(orderedList);
}

function renderDocumentStructure() {
  const container = document.getElementById('document-structure-container');
  if (!container) {
    console.error('Container element not found');
    return;
  }

  // Clear any existing content
  container.innerHTML = '';

  // Build the nested list
  buildNestedList(documentStructure, container);
}

document.addEventListener('DOMContentLoaded', () => {
  renderDocumentStructure();
});


// I need an onclick function for the show-hide button that will toggle the hidden class on and off
function toggleDetails() {
  const details = document.querySelector('.revisions');
  details.classList.toggle('hidden');
}

// I need an onclick function for the expand-shrink button that will toggle the hidden class on and off for each revision item except the first one which should always be visible
function toggleRevisionList() {
  const revisions = document.querySelectorAll('.revision-item');
  revisions.forEach((item, index) => {
    if (index !== 0) { // Skip the first item
      item.classList.toggle('hidden');
    }
  });
}


// Select the HTML elements we need to work with
const myList = document.getElementById('myList');
const myTextarea = document.getElementById('myTextarea');
// const addToListBtn = document.getElementById('addToListBtn');

// Function to handle adding the item to the list
function addListItem() {
  const newText = myTextarea.value.trim();

  if (newText !== "") {
    const newListItem = document.createElement('li');
    // newListItem.className = 'decimalListItem';
    newListItem.textContent = newText;
    myList.appendChild(newListItem);

    // Add the click listener to the new item
    newListItem.addEventListener('click', editListItem);

    myTextarea.value = ""; // Clear the textarea
  }
}

// Function to handle editing an item
function editListItem(event) {
  const listItem = event.target;
  const currentText = listItem.textContent;

  // Create a new textarea for editing
  const editArea = document.createElement('textarea');
  editArea.className = 'editTextArea';
  editArea.value = currentText;

  // Replace the list item's content with the textarea
  listItem.textContent = '';
  listItem.appendChild(editArea);
  editArea.focus();

  // Event listener to save the changes when the user clicks away
  editArea.addEventListener('blur', saveChanges);

  // Event listener to save changes when the "Enter" key is pressed
  editArea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      editArea.blur(); // Trigger the blur event to save
    }
  });
}

// Function to save the edited text
function saveChanges(event) {
  const editArea = event.target;
  const listItem = editArea.parentElement;

  listItem.textContent = editArea.value;
  editArea.remove();
}

// Event listener for the button
// addToListBtn.addEventListener('click', addListItem);

// Event listener for the textarea to detect the "Enter" key
myTextarea.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    addListItem();
  }
});

function populateDocumentElements() {
  const container = document.getElementById(document - elements - list);

}