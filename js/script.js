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


// Define classes for Document Elements

/*
* Class representing a node in a recursive tree structure.
* This structure should allow for inifinite nesting.
*/
class DocumentNode {
  constructor(id, name, content, order = 0, children = []) {
    this.id = id;
    this.name = name;
    this.content = content;
    this.order = order;

    this.children = children; // Array of DocumentNode
  }
  addChild(childNode) {
    if (childNode instanceof DocumentNode) {
      this.children.push(childNode);
      this.children.sort((a, b) => a.order - b.order); // Maintain order
    } else {
      throw new Error("Child must be an instance of DocumentNode");
    }
  }
}


const debugMode = true; // Set to true to enable debug messages

// Debugging function - disable the const debugMode to turn off all debug messages
function debugMessage(message, data = []) {
  if (!debugMode) return false; // Exit if debug mode is off

  console.log("DEBUG:", message, data); // Log the debug message

  return true;
}


// TEST Data for Document Elements
// Level 3 (Deepest)
const node_1_1_1 = new DocumentNode(
  '1-1-1',
  'T 1.1.1',
  'List all necessary tools and access credentials.',
  1,
);

// Level 1.1
const node_1_1 = new DocumentNode(
  '1-1',
  'T 1.1',
  'Initial steps before starting the procedure.',
  2,
  // [node_1_1_1] // Contains node_1_1_1
);

//
const node_1_2 = new DocumentNode(
  '1-2',
  'T 1.2',
  'The main procedural steps.',
  3
);


// Duplicate Level 2 for testing re-parenting
const node_1_2b = new DocumentNode(
  '1-2',
  'T 1.2 Duplicate',
  'Citations and reference materials.',
  4
);

//
const node_1_2_2 = new DocumentNode(
  '1-2-2',
  'T 1.22',
  'The main procedural steps.',
  5
);


// Duplicate Level 2 for testing re-parenting
const node_1_2_2b = new DocumentNode(
  '1-2-2',
  'T 1.22 Duplicate',
  'Citations and reference materials.',
  6
);

// Subsequent Level 2 for testing re-ordering of duplicates (1-2b should come after 1-3 after re-parenting -- or should become 1-3??)
const node_1_3 = new DocumentNode(
  '1-3',
  'T 1.3',
  'Citations and reference materials.',
  7
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
  9
);

const node_3 = new DocumentNode(
  '3',
  'T 3',
  'Supplementary information and resources.',
  10
);

// Level 3 under node_3 but with poor initial ID structure to test re-parenting
const node_3_1_1 = new DocumentNode(
  '3-1-1-1',
  'T 3.1.1.1',
  'Links to external resources and references.',
  11
);

// Another Level 2 under node_3 with poor initial ID structure to test re-parenting and ordering
const node_3_22 = new DocumentNode(
  '3-22',
  'T 3.22',
  'Extra documents and materials for reference.',
  12,

);

// Another Level 2 under node_3 with poor initial ID structure to test re-parenting and ordering
const node_3_22b = new DocumentNode(
  '3-22b',
  'T 3.22',
  'Extra documents and materials for reference.',
  13,

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
  node_1_2_2, // Original
  node_1_2_2b // Duplicate to test re-parenting / correction to an alternative order and id while maintaining name

];


/*
* This function will take any supplied ID and break it down into an array of values and then increment the final value by 1 and return that number
*
* TODO: need error checking - what if the last array item wasn't a number?
*/
function generateNewID(currentID) {

  // Split the ID into parts
  const idParts = currentID.split('-');

  idParts.forEach(id => {
    const idInteger = parseInt(id);
    //debugMessage("ID item is of type: ", typeof(idInteger));
    if (typeof (idInteger) != 'number') {
      console.log(Error = "Error: not a number");
    }

    else {
      // console.log(`Got past the error check`);
      // Get the last part and load it into a variable as an integer
      idParts[idParts.length - 1] = parseInt(idParts.slice(-1)[0], 10) + 1;
      idParts[idParts.length - 1] = idParts[idParts.length - 1].toString(); // There has to be a more efficient way to do this instead of on two lines??


      //debugMessage(`Final ID Parts:`, idParts); //TEST LOG

      //Build out the new ID into a string that we can use in HTML later on
      let updatedID = idParts.join('-');
      debugMessage(`Duplicate node ID found: ${currentID}. Assigning new unique ID: ${updatedID}`); //TEST LOG

      return updatedID;

    }

  });

  return -1;

}


function populateNodeMapOOP(flatNodes) {
  debugMessage("populateNodeMap called with flatNodes:", flatNodes); //TEST LOG

  // Test log each node's ID
  const nodeMap = new Map();  // Map to hold nodes by ID
  const existingSubNodes = [];
  const existingIDs = [];


  // First, create a map of all nodes by their IDs
  flatNodes.forEach(node => {
    //console.log(node.id); //TEST LOG
    let newID = "";
    const currentNodeId = node.id;  // Store current node ID for reference
    debugMessage(`Current existingIDs: `, existingIDs);

    // Iterate through existing children and assign them to the map ensuring that all duplication is handled by assigning consecutive unique IDs
    if (nodeMap.has(currentNodeId)) {
      debugMessage("IF: currentNodeID", currentNodeId);
      console.log(existingIDs.includes(currentNodeId));

      
      //TODO
      //This loop is meant to check for the presence of duplicate ID's - the first time, just log them to a duplicate array, the second time change the ID so we don't have duplicates
      if (existingIDs.includes(currentNodeId)) {
        debugMessage("Got here #2");
      //generateNewID(currentNodeId);
        currentNodeId = generateNewID(currentNodeId); 
        
        }
        
        else {
          debugMessage("Got here #3", currentNodeId);
          existingIDs.push(currentNodeId);
        }

        nodeMap.set(currentNodeId, node);

    }
    else {
      nodeMap.set(currentNodeId, node);
    }








    // Check for existing children and log them to an array (existingSubNodes) in order to avoid duplication
    if (node.children.length > 0) {

      // console.log(`Node ID: ${node.id} has pre-existing children:`); //DEBUG LOG
      node.children.forEach(child => {
        // console.log(` - Child ID: ${child.id}`);  //DEBUG LOG
        existingSubNodes.push(child.id);
      });

    } else {
      // console.log(`Node ID: ${node.id} has no children.`);
      nodeMap.set(node.id, node);
    }

  });

  const returnObjects = [nodeMap, existingSubNodes];

  return (returnObjects);

}


/*
*
* A function that will take a flat array of nodes (not a matrix) and build the hierarchy based on the IDs using OOP principles (if they aren't already nested)
* Must be implemented using object-oriented programming principles.
*/
function buildHierarchyOOP(flatNodes) {

  // debugMessage("buildHierarchyOOP called with flatNodes:", flatNodes); //TEST LOG


  // Create a map of all nodes by their IDs
  const nodeObjects = populateNodeMapOOP(flatNodes);
  const nodeMap = nodeObjects[0]; // Extract the nodeMap from the returned objects
  debugMessage("Node Map populated:", typeof (nodeMap)); //TEST LOG
  const existingSubNodes = nodeObjects[1];  // Extract existingSubNodes array
  debugMessage("Existing Sub Nodes:", existingSubNodes.Map); //TEST LOG


  // TEST LOG - Iterate through the nodeMap to verify contents
  nodeMap.forEach((node, nodeId) => {
    //debugMessage(`Node ID in Map: ${nodeId}`, node); //TEST LOG
  });

  // Check for existing children and log them to an array (existingSubNodes) in order to avoid duplication
  // Check for duplicated ids and correct them by appending a suffix or incrementing number
  // Sort the flatNodes array by order first to ensure correct processing sequence
  // Iterate through the flatNodes array to establish parent-child relationships
  // Ensure that all nodes (root and children) are numbered consecutively
  // Return the array of root nodes
  return nodeMap; //TEMPORARY RETURN TO AVOID ERRORS WHILE TESTING
}


//A function that will take a flat array of nodes (not a matrix) and build the hierarchy based on the IDs (if they aren't already nested) (OLD WAY)
// function buildHierarchy(flatNodes) {

//   const nodeMap = new Map();
//   const rootNodes = [];
//   const existingSubNodes = [];
//   const duplicatedObjects = [];

//   // console.log(nodeMap); //TEST LOG

//   // First, create a map of all nodes by their IDs
//   flatNodes.forEach(node => {
//     //console.log(node.id); //TEST LOG

//     // Check for existing children and log them to an array (existingSubNodes) in order to avoid duplication
//     if (node.children.length > 0) {
//       // Iterate through existing children
//       // console.log(`Node ID: ${node.id} has pre-existing children:`); //DEBUG LOG
//       node.children.forEach(child => {
//         // console.log(` - Child ID: ${child.id}`);  //DEBUG LOG
//         existingSubNodes.push(child.id);
//       });

//     } else {
//       // console.log(`Node ID: ${node.id} has no children.`);
//       nodeMap.set(node.id, node);
//     }

//   });




//   // Then, iterate again to establish parent-child relationships
//   flatNodes.forEach(node => {

//     // Skip nodes that are already children of other nodes (in the case of preexisting nested structures we don't want to waste time re-adding or duplicating them)

//     if (existingSubNodes.includes(node.id)) {
//       // console.log(`Skipping node ID: ${node.id} as it is already a child of another node.`);

//       //TODO - we still need the ability to add references to these nodes so that the algorithm can still account for them in the numbering system - perhaps we can add them to the nodeMap with a special flag?

//       // FYI - i think this is causing duplication / sequencing issues currently with the subsequent elements being added again as root nodes

//       // why is this happening - because they exist as children already so we skip them here but then later on when we build the rootNodes array we add them again because they are in the flatNodes array still

//       // Potential solution - when we skip them here we can still add them to the nodeMap but with a special flag so that later on when we build the rootNodes array we can check for that flag and avoid adding them again

//       // Flag these items as pre-existing children to avoid duplication
//       duplicatedObjects.push(node.id);

//       return; // Skip this node as it's already a child
//     }

//     // Split the ID to determine parentage
//     const idParts = node.id.split('-');

//     // If there are multiple parts, we assume it has a parent (or should have one at least, we'll check for higher level parents if the immediate one isn't found)
//     if (idParts.length > 1) {

//       // This node has a parent - determine the parent ID
//       const parentId = idParts.slice(0, -1).join('-');
//       // console.log(`Node ID: ${node.id} has parent ID: ${parentId}`); //TEST LOG

//       // Look up the parent node in the map
//       const parentNode = nodeMap.get(parentId);
//       // console.log(`Parent ID for node ${node.id} is ${parentId}`); //TEST LOG

//       // If a parent node is found, add this node as its child
//       if (parentNode) {
//         parentNode.addChild(node);
//       }

//       // Else, if no parent node is found, we need to check for higher level parents
//       else {

//         // Check for a higher level parent
//         let higherLevelParentId = null; // Initialize variable to hold higher level parent ID

//         // Iterate backwards through the ID parts to find the nearest existing parent
//         for (let i = idParts.length - 2; i > 0; i--) {
//           higherLevelParentId = idParts.slice(0, i).join('-');  // Get the higher level parent ID
//           const higherLevelParentNode = nodeMap.get(higherLevelParentId); // Look up the higher level parent node

//           // console.log(`Checking for higher level parent ID: ${higherLevelParentId} for node ID: ${node.id}`); //TEST LOG

//           // If found, add this node as its child and break the loop
//           if (higherLevelParentNode) {
//             //console.log(`Higher level parent ID for node ${node.id} is ${higherLevelParentId}`); //TEST LOG
//             higherLevelParentNode.addChild(node); // Add as child to the higher level parent

//             // Amend the node.id to reflect the new parentage
//             node.id = higherLevelParentId + '-' + node.id.split('-').slice(-1);

//             // Amend the id.order to reflect the new parentage
//             node.order = higherLevelParentNode.order + (parseFloat(node.id.split('-').slice(-1)) * 0.1);  // Simple way to adjust order based on new parent
//             break;  // Exit the loop once a parent is found
//           }
//         }

//         // If still no parent found, treat as root
//         if (!higherLevelParentId) {
//           rootNodes.push(node); // Add to root nodes
//           // console.log(`No parent found for node ID: ${node.id}. Added as root node.`); //TEST LOG
//         }
//       }
//     }
//     // No parent, this is a root node
//     else {
//       // console.log(`Node ID: ${node.id} is a root node.`); //TEST LOG
//       rootNodes.push(node); // Add to root nodes
//     }
//   });



//   //Then iterate again so that the root nodes are ordered consecutively according to closest prior formatting
//   rootNodes.sort((a, b) => a.order - b.order);  // Sort root nodes by order
//   // console.log("Sorted Root Nodes:", rootNodes); //TEST LOG


//   /*
//   *At this point, all nodes should be properly nested. Now we need to ensure that all nodes (root and children) are numbered consecutively.
//   */

//   //Iterate through root nodes and their children to assign correct order and IDs
//   rootNodes.forEach((node, index) => {
//     node.order = index + 1; // Assign order starting from 1
//     //console.log(`String Order for Root Node: ${node.order}`); //TEST LOG
//     node.id = (index + 1).toString(); // Assign ID to be consecutive numbers as strings
//     // console.log(`Assigned Node ID: ${node.id}, Order: ${node.order}`); //TEST LOG

//     // Now handle children recursively
//     function assignChildOrderAndIds(parentNode) {
//       parentNode.children.sort((a, b) => a.order - b.order); // Sort children by order

//       // Iterate through children to assign order and IDs
//       parentNode.children.forEach((childNode, childIndex) => {
//         // Convert parentNode.order to a string with decimal places based on depth
//         const orderString = parentNode.order.toString() + '.' + (childIndex + 1).toString();

//         /*
//          * Build a new string where only the left-most decimal point is kept
//          * (to avoid issues with multiple decimal points in a number),
//          * bear in mind there might be significant decimal places already present beyond our test objects.
//         */
//         const orderParts = orderString.split('.');  // Split by decimal point
//         childNode.order = parseFloat(orderParts[0] + '.' + orderParts.slice(1).join('')); // Rejoin all parts after the first decimal point

//         // console.log(`String Order for Child Node: ${childNode.order}`); //TEST LOG

//         childNode.id = parentNode.id + '-' + (childIndex + 1).toString(); // Assign ID based on parent
//         // console.log(`  Assigned Child Node ID: ${childNode.id}, Order: ${childNode.order}, Name: ${childNode.name}`); //TEST LOG

//         // Recursively assign for any sub-children
//         if (childNode.children.length > 0) {
//           assignChildOrderAndIds(childNode);  // Recursive call
//         }
//       } );
//     }
//     assignChildOrderAndIds(node); // Initial call for the current root node
//   });




//   /*
//   rootNodes.forEach((node, index) => {
//     node.order = index + 1; // Reassign order starting from 1
//     node.id = (index + 1).toString(); // Reassign ID to be consecutive numbers as strings
//     console.log(`Reassigned Node ID: ${node.id}, Order: ${node.order}`); //TEST LOG
//   });
// */

//   // console.log("Final Root Nodes:", rootNodes); //TEST LOG

//   return rootNodes;
// }

const nodesOOP = buildHierarchyOOP(flatNodeList); //TODO - Replace this with actual data retrieval logic
//const nodes = buildHierarchy(flatNodeList); //TODO - Replace this with actual data retrieval logic - TEMPORARILY DISABLED FOR OOP TESTING (OLD WAY)

// The final data structure is an array of the top-level nodes
const documentStructure = [...nodesOOP]; // Used to populate the document structure (could be used for final code as it adds all elements within it to the system)
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

    // sectionLink.setAttribute('clickable', 'true');

    //Set the text and data attributes    
    // sectionLink.textContent = node.id + " " + node.name; //WAS THIS BEFORE TEXT EDITING

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