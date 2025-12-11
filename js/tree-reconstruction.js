/**
 * Tree Reconstruction Module
 * Reconstructs hierarchical document structure from flat lists
 */

/**
 * Reconstructs a nested, hierarchical structure from a flat list
 * by analyzing ID patterns. Groups problematic IDs under cleanup nodes.
 * 
 * @param {Object[]} flatList - Array of flat document elements with id, name, content, order
 * @returns {Object[]} Array of root nodes with nested children
 * @throws {Error} If flatList is invalid
 */
export function reconstructTreeFromFlatList(flatList) {
    // Validate input
    if (!Array.isArray(flatList)) {
        throw new Error('flatList must be an array');
    }

    if (flatList.length === 0) {
        return [];
    }

    try {
        // 1. Sort for consistent processing
        const sortedList = [...flatList].sort((a, b) => {
            if (a.order !== b.order) {
                return a.order - b.order;
            }
            return (a.id || '').toString().localeCompare((b.id || '').toString());
        });

        // 2. Build node map for fast lookups
        const nodeMap = new Map();
        const rawNodes = [];

        for (const raw of sortedList) {
            if (!raw.id) {
                console.warn('Skipping node without ID:', raw);
                continue;
            }

            const node = { 
                ...raw, 
                children: [],
                id: String(raw.id) // Ensure ID is string
            };
            
            nodeMap.set(node.id, node);
            rawNodes.push(node);
        }

        const rootNodes = [];
        const cleanupMap = new Map();

        // 3. Build tree structure
        for (const node of rawNodes) {
            const currentIdParts = node.id.split('-');

            // Handle root nodes (single segment IDs)
            if (currentIdParts.length === 1) {
                rootNodes.push(node);
                continue;
            }

            // Find the highest existing ancestor
            const { ancestor, isBrokenChain, isNonStandard } = findAncestor(
                node,
                currentIdParts,
                nodeMap
            );

            if (!ancestor) {
                // Orphaned node - add as root
                rootNodes.push(node);
                continue;
            }

            // Handle problematic nodes
            if (isBrokenChain || isNonStandard) {
                const groupPlaceholder = ensureCleanupGroup(
                    ancestor,
                    node,
                    currentIdParts,
                    nodeMap,
                    cleanupMap
                );
                groupPlaceholder.children.push(node);
            } else {
                // Normal case - attach to parent
                ancestor.children.push(node);
            }
        }

        return rootNodes;

    } catch (error) {
        console.error('Error reconstructing tree:', error);
        throw new Error(`Tree reconstruction failed: ${error.message}`);
    }
}

/**
 * Finds the highest existing ancestor for a node
 * @private
 */
function findAncestor(node, currentIdParts, nodeMap) {
    let foundAncestor = null;
    const tempParts = [...currentIdParts];

    // Walk up the ID hierarchy
    while (tempParts.length > 1) {
        tempParts.pop();
        const potentialParentId = tempParts.join('-');
        const ancestorNode = nodeMap.get(potentialParentId);

        if (ancestorNode) {
            foundAncestor = ancestorNode;
            break;
        }
    }

    if (!foundAncestor) {
        return { ancestor: null, isBrokenChain: false, isNonStandard: false };
    }

    // Check if this is a direct parent or broken chain
    const intendedParentId = currentIdParts.slice(0, -1).join('-');
    const isBrokenChain = foundAncestor.id !== intendedParentId;

    // Check for non-standard IDs (high numbers or broken chains)
    const STANDARD_ID_THRESHOLD = 10;
    const isNonStandard = 
        (currentIdParts.length > 1 && parseInt(currentIdParts[1], 10) > STANDARD_ID_THRESHOLD) || 
        isBrokenChain;

    return { ancestor: foundAncestor, isBrokenChain, isNonStandard };
}

/**
 * Ensures a cleanup group exists for problematic nodes
 * @private
 */
function ensureCleanupGroup(ancestor, node, currentIdParts, nodeMap, cleanupMap) {
    const rootAncestorId = ancestor.id.split('-')[0];
    let rootData = cleanupMap.get(rootAncestorId);

    // Create cleanup box if needed
    if (!rootData) {
        const cleanupBoxId = `${rootAncestorId}-99999`;
        const cleanupBox = {
            id: cleanupBoxId,
            name: `${rootAncestorId} - AUTO`,
            content: 'This node groups items with problematic, duplicated, or non-sequential IDs. Please review and re-parent the groups below.',
            order: 9999,
            children: []
        };

        const rootNode = nodeMap.get(rootAncestorId);
        if (rootNode) {
            rootNode.children.push(cleanupBox);
            nodeMap.set(cleanupBoxId, cleanupBox);
            rootData = { cleanupBox, groups: new Map() };
            cleanupMap.set(rootAncestorId, rootData);
        } else {
            throw new Error(`Root node ${rootAncestorId} not found for cleanup box`);
        }
    }

    // Get or create group placeholder
    const groupKey = currentIdParts.length > 1 ? currentIdParts[1] : '0';
    const groupPlaceholderId = `${rootAncestorId}-${groupKey}`;
    
    let groupPlaceholder = rootData.groups.get(groupPlaceholderId);

    if (!groupPlaceholder) {
        groupPlaceholder = {
            id: groupPlaceholderId,
            name: `Group ${groupKey}`,
            content: `This group contains items whose second segment is '${groupKey}'. Original IDs include ${node.id}.`,
            order: parseInt(groupKey, 10) || 0,
            children: []
        };
        
        rootData.groups.set(groupPlaceholderId, groupPlaceholder);
        rootData.cleanupBox.children.push(groupPlaceholder);
        nodeMap.set(groupPlaceholderId, groupPlaceholder);
    }

    return groupPlaceholder;
}

/**
 * Validates a flat list before reconstruction
 * @param {Array} flatList - The list to validate
 * @returns {Object} Validation result with { isValid: boolean, errors: string[] }
 */
export function validateFlatList(flatList) {
    const errors = [];

    if (!Array.isArray(flatList)) {
        return { isValid: false, errors: ['Input must be an array'] };
    }

    flatList.forEach((item, index) => {
        if (!item.id) {
            errors.push(`Item at index ${index} missing required 'id' property`);
        }
        if (!item.name) {
            errors.push(`Item at index ${index} missing required 'name' property`);
        }
        if (item.order === undefined) {
            errors.push(`Item at index ${index} missing 'order' property`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors
    };
}
