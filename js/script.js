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


// TEST Data for Document Elements
// Level 3 (Deepest)
const node_1_1_1 = new DocumentNode(
    '1-1-1', 
    'Detailed Pre-Requisites', 
    'List all necessary tools and access credentials.', 
    1.11
);

// Level 2
const node_1_1 = new DocumentNode(
    '1-1', 
    'Preparation Steps', 
    'Initial steps before starting the procedure.', 
    1.1, 
    // [node_1_1_1] // Contains node_1_1_1
);

const node_1_2 = new DocumentNode(
    '1-2', 
    'Execution Phase', 
    'The main procedural steps.', 
    1.2
);

// Level 1 (The Root/Main Headings)
const node_1 = new DocumentNode(
    '1', 
    'Main Procedure', 
    'Overview of the entire process.', 
    1.0, 
    //[node_1_1, node_1_2] // Contains node_1_1 and node_1_2
);

const node_2 = new DocumentNode(
    '2', 
    'Compliance & Review', 
    'Checklist for final review.', 
    2.0
);

const node_3 = new DocumentNode(
    '3', 
    'Appendices', 
    'Supplementary information and resources.', 
    3.0
);

const flatNodeList = [
  node_3,
  node_1,
  node_1_1,
  node_1_1_1,
  node_1_2,
  node_2
];

//Function to check is an object is already a part of a hierarchy
function isNested(node, nodeList) {
  for (const potentialParent of nodeList) {
    if (potentialParent.children.includes(node)) {
      return true;
    }
  }
  return false;
}



//A function that will take a flat array of nodes and build the hierarchy based on the IDs (if they aren't already nested)
function buildHierarchy(flatNodes) {

  const nodeMap = new Map();
  const rootNodes = [];
  // First, create a map of all nodes by their IDs
  flatNodes.forEach(node => {
    nodeMap.set(node.id, node);
    console.log("Mapping node ID:", node.id); //TEST LOG
  });
  // Then, iterate again to establish parent-child relationships
  flatNodes.forEach(node => {
    const idParts = node.id.split('-');
    if (idParts.length > 1) {
      // This node has a parent
      const parentId = idParts.slice(0, -1).join('-');
      const parentNode = nodeMap.get(parentId);
      if (parentNode) {
        parentNode.addChild(node);
      } else {
        // Parent not found, treat as root
        rootNodes.push(node);
      }
    } else {
      // No parent, this is a root node
      rootNodes.push(node);
    }
  });
  return rootNodes;
}


const nodes = buildHierarchy(flatNodeList); //TODO - Replace this with actual data retrieval logic

// The final data structure is an array of the top-level nodes
const documentStructure = [...nodes]; // Used to populate the document structure (could be used for final code as it adds all elements within it to the system)
console.log(documentStructure); //Test log to verify structure



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