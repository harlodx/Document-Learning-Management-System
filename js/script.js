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

// [x] Write a recursive 'findNodeById' function to locate any SectionNode object.

// [x] Re-Bind the 'contextmenu' event listener specifically to the list links 
//     (.section-heading-link) and capture the target node's ID.

// [x] Use the captured ID and 'findNodeById' to set the custom menu's title 
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
3.  [x] **Hydration**: When loading the document, consider writing a recursive function
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


// Import DocumentNode class
import DocumentNode from "./documentnode.js";


/**
 * Class designed to represent a node in a hierarchical document structure.
 */

class TestJsonDocument {
  constructor(id, name, content = [], order, children = []) {
    this.id = id;
    this.name = name;
    this.content = content;
    this.order = order;
    this.children = children;
  }
}


class RevisionDocument {
  constructor(id, date, user, commitNotes) {
    this.id = id;
    this.date = date;
    this.user = user;
    this.commitNotes = commitNotes;
  }
}

let revision_doc_1 = {
  id: 1,
  date: new Date,
  user: "Harlo",
  commitNotes: "Added recursive check for existing tree objects"
}

let revision_doc_2 = {
  id: 2,
  date: new Date,
  user: "Harlo",
  commitNotes: "Added recursive check for existing tree objects"
}

let revision_doc_3 = {
  id: 3,
  date: new Date,
  user: "Harlo",
  commitNotes: "Added recursive check for existing tree objects"
}

const revisionList = [
  revision_doc_1,
  revision_doc_2,
  revision_doc_3
]


function addRevisionItem(revisionItem, elementId){
  // const revisionObject = revisionItem;

  if (revisionItem.id){
    console.log(`Revision with id of ${revisionItem.id} contains the following object: `, revisionItem);
  } else {
    console.log(`The supplied revisionItem: ${revisionItem} does not contained a valid object`);
    return;
  }

  //  Populate the supplied document element
  const element = document.createElement("li");
  if (element == null) {  // nothing in the element
    console.log(`Element id of ${elementId} returns null`);    
  } else {  // valid something in the element
    console.log(`Element id of ${elementId} is populated with: `, element);    
  }

  //lement.set


  // Build out the html
  //element.innerHTML = ''; //  Clear the inner html


}

function buildRevisionList(revisionList) {
  const revisions = document.getElementById("revisions-list");
  
  revisions.innerHTML = ''; // Clear any innerHTML
  console.log(`revisionList is populated with the following object: `, revisionList);


  // TODO - build out the array in descending order so that it displays most recent iterations at the top


  revisionList.forEach(revisionItem =>{
    console.log(`Revision item is: `, revisionItem);
    //addRevisionItem(revisionItem, revisionItem.id);
    const newElement = document.createElement("li");
    newElement.setAttribute("id", `revision-${revisionItem.id}`); // Set the id to whatever the revision id is
    newElement.className = "revision-item content-container"; // Set the classes for styling


    // TODO - add in the structure here for the revisions
    const revisionContent = document.createElement("div");
    revisionContent.className = "content-left";
    revisionContent.textContent = `${revisionItem.id} - ${revisionItem.date} - ${revisionItem.user} - ${revisionItem.commitNotes}`;;

    // TODO - buttons for the version item
    
    //  View Button
    const viewButton = document.createElement("button");
    viewButton.className="dynamic-item";
    viewButton.textContent="View";
    viewButton.setAttribute("id", "view-"+ revisionItem.id);

    // Revert Button
    const revertButton = document.createElement("button");
    revertButton.className="dynamic-item";
    revertButton.textContent="Revert";
    revertButton.setAttribute("id", "revert-"+ revisionItem.id);

    // Buttons container (right-side)
    const revisionButtons = document.createElement("div");
    revisionButtons.className = "right-buttons";
    revisionButtons.appendChild(viewButton);
    revisionButtons.appendChild(revertButton);

    // Element that combines the version details as well as the buttons
    newElement.appendChild(revisionContent);  //  Add the revision item into the DOM
    newElement.appendChild(revisionButtons);

    // Append the child iteratively to the list
    revisions.appendChild(newElement);  //add this item to the ul item
  });

}


//addRevisionItem(revision_doc_1, "revision-1");
buildRevisionList(revisionList);  // Call to build a revision array into the DOM

/**
 * Reconstructs a nested, hierarchical structure (POJOs) from a flat list 
 * by analyzing the ID pattern. Groups messy/non-standard IDs under a single 
 * Cleanup Box, with internal grouping based on the intended immediate parent segment.
 * @param {RawDocumentElement[]} flatList - The array of raw document elements.
 * @returns {Object[]} The array of root nodes with nested children.
 */
function reconstructTreeFromFlatList(flatList) {
  // 1. Sort the list to ensure consistent processing order 
  flatList.sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.id.localeCompare(b.id);
  });

  // 2. Map nodes by ID for fast parent lookup
  const nodeMap = new Map();
  const rawNodes = [];

  for (const raw of flatList) {
    const node = { ...raw, children: [] };
    nodeMap.set(node.id, node);
    rawNodes.push(node);
  }

  const rootNodes = [];
  // Map to hold the cleanup box and its internal group placeholders for each ancestor root
  // Format: { 'RootId': { cleanupBox: POJO, groups: { 'GroupKey': POJO } } }
  const cleanupMap = new Map();

  // 3. Attach children to parents (Iterative Ancestor Search + Nested Targeted Grouping)
  for (const node of rawNodes) {
    let currentIdParts = node.id.split('-');

    // Handle true root nodes
    if (currentIdParts.length === 1) {
      rootNodes.push(node);
      continue;
    }

    let foundAncestor = null;

    // Find the highest existing ancestor
    let tempParts = [...currentIdParts];
    while (tempParts.length > 1) {
      tempParts.pop();
      const potentialParentId = tempParts.join('-');

      const ancestorNode = nodeMap.get(potentialParentId);

      if (ancestorNode) {
        foundAncestor = ancestorNode;
        break;
      }
    }

    let currentParent = foundAncestor;

    if (currentParent) {
      // Check if the actual parent exists right above this node. If not, it's messy.
      const intendedParentId = currentIdParts.slice(0, currentIdParts.length - 1).join('-');
      const isBrokenChain = currentParent.id !== intendedParentId;

      // Check for non-standard IDs (high numbers like 3-22, or broken chains)
      const isNonStandard = (currentIdParts.length > 1 && parseInt(currentIdParts[1], 10) > 10) || isBrokenChain;


      if (isBrokenChain || isNonStandard) {

        const rootAncestorId = currentParent.id.split('-')[0];
        let rootData = cleanupMap.get(rootAncestorId);

        if (!rootData) {
          // 3a. Create the top-level Cleanup Box
          const cleanupBoxId = `${rootAncestorId}-99999`;
          const cleanupBox = {
            id: cleanupBoxId,
            name: `${rootAncestorId} - AUTO`,
            content: `This node groups items with problematic, duplicated, or non-sequential IDs. Please review and re-parent the groups below.`,
            order: 9999,
            children: []
          };

          const rootNode = nodeMap.get(rootAncestorId);
          if (rootNode) {
            rootNode.children.push(cleanupBox);
            nodeMap.set(cleanupBoxId, cleanupBox);
            rootData = { cleanupBox: cleanupBox, groups: new Map() };
            cleanupMap.set(rootAncestorId, rootData);
          }
        }

        // 3b. Determine the Group Key (the second segment of the messy ID)
        const groupKey = currentIdParts.length > 1 ? currentIdParts[1] : '0'; // Use '0' if no segment exists (shouldn't happen here)
        const groupPlaceholderId = `${rootAncestorId}-${groupKey}`; // e.g., '3-2' for 3-22

        let groupPlaceholder = rootData.groups.get(groupPlaceholderId);

        if (!groupPlaceholder) {
          // 3c. Create the Nested Group Placeholder
          groupPlaceholder = {
            id: groupPlaceholderId,
            name: `${groupPlaceholderId}-${groupKey}`,
            content: `This group contains messy IDs whose second segment is '${groupKey}'. Original IDs include ${node.id}.`,
            order: parseInt(groupKey, 10), // Use the group key for internal sorting
            children: []
          };
          rootData.groups.set(groupPlaceholderId, groupPlaceholder);
          rootData.cleanupBox.children.push(groupPlaceholder);
          nodeMap.set(groupPlaceholderId, groupPlaceholder); // Add to map for completeness
        }

        // 3d. Attach the messy node to the Group Placeholder
        currentParent = groupPlaceholder;

      }

      // Attach the node to its determined parent (normal or group placeholder)
      currentParent.children.push(node);

    } else {
      // Truly an orphaned root node (e.g., its ID '1-2-3' but '1' is missing)
      rootNodes.push(node);
    }
  }

  return rootNodes;
}


const debugMode = true; // Set to true to enable debug messages

// Debugging function - disable the const debugMode to turn off all debug messages
function debugMessage(message, data = []) {
  if (!debugMode) return false; // Exit if debug mode is off

  if (data[0] == undefined || data[0] == undefined || data[0] == null) {
    console.log("DEBUG:", message); // Log the debug message  
    return true;
  } else {
    console.log("DEBUG:", message, data); // Log the debug message
  }

  return true;
}


// TEST Data for Document Elements
// Level 3 (Deepest)
const node_1_1_1 = new TestJsonDocument(
  '1-1-1',
  'T 1.1.1',
  'List all necessary tools and access credentials.',
  15,
);

// Level 1.1
const node_1_1 = new TestJsonDocument(
  '1-1',
  'T 1.1',
  'Initial steps before starting the procedure.',
  14,
  // [node_1_1_1] // Contains node_1_1_1
);

//
const node_1_2 = new TestJsonDocument(
  '1-2',
  'T 1.2',
  'The main procedural steps.',
  13
);


// Duplicate Level 2 for testing re-parenting
const node_1_2b = new TestJsonDocument(
  '1-2',
  'T 1.2 Duplicate',
  'Citations and reference materials.',
  12
);

//
const node_1_2_2 = new TestJsonDocument(
  '1-2-2',
  'T 1.22',
  'The main procedural steps.',
  11
);


// Duplicate Level 2 for testing re-parenting
const node_1_2_2b = new TestJsonDocument(
  '1-2-2b',
  'T 1.22 Duplicate',
  'Citations and reference materials.',
  10
);

// Subsequent Level 2 for testing re-ordering of duplicates (1-2b should come after 1-3 after re-parenting -- or should become 1-3??)
const node_1_3 = new TestJsonDocument(
  '1-3',
  'T 1.3',
  'Citations and reference materials.',
  9
);

// Level 1 (The Root/Main Headings)
const node_1 = new TestJsonDocument(
  '1',
  'T 1',
  'Overview of the entire process.',
  8,
  [node_1_1, node_1_2] // Contains node_1_1 and node_1_2
);

const node_2 = new TestJsonDocument(
  '2',
  'T 2',
  'Checklist for final review.',
  7
);

const node_3 = new TestJsonDocument(
  '3',
  'T 3',
  'Supplementary information and resources.',
  6
);

// Level 3 under node_3 but with poor initial ID structure to test re-parenting
const node_3_1_1 = new TestJsonDocument(
  '3-1-1-1',
  'T 3.1.1.1',
  'Links to external resources and references.',
  5
);

// Another Level 2 under node_3 with poor initial ID structure to test re-parenting and ordering
const node_3_22 = new TestJsonDocument(
  '3-22',
  'T 3.22',
  'Extra documents and materials for reference.',
  4,

);

// Another Level 2 under node_3 with poor initial ID structure to test re-parenting and ordering
const node_3_22b = new TestJsonDocument(
  '3-22',
  'T 3.22b',
  'A duplicate ID',
  2,

);

// Another Level 2 under node_3 with poor initial ID structure to test re-parenting and ordering
const node_3_22c = new TestJsonDocument(
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



// 1. Reconstruct the POJO structure from the flat list
const nestedJsonStructure = reconstructTreeFromFlatList(flatNodeList);
console.log(`\nReconstruction successful. Found ${nestedJsonStructure.length} Root nodes.`);
console.log('Root node IDs (before DocumentNode hydration):', nestedJsonStructure.map(n => n.id).join(', '));

DocumentNode._existingIds.clear();
const rootNodes = nestedJsonStructure.map(jsonNode => DocumentNode.fromJSON(jsonNode, null));


// The final data structure is an array of the top-level nodes
const documentStructure = [...rootNodes]; // Used to populate the document structure (could be used for final code as it adds all elements within it to the system) -- currently using test data from a set of static data. TODO: create a test API that provides a few hundred random nodes that we can use to test with [ ].


/*
** Recursive function to render the document structure into HTML
* @{DocumentNode[]} nodes - Array of DocumentNode to render.
* @{HTMLElement} container - The DOM element to append the <ol> to.
*/
function buildNestedList(nodes, parentElement, isChild) {

  //depth monitor
  let depthOfTree = 0;

  // 1. Create the <ol> for the current level
  const orderedList = document.createElement('ul'); //was <ol>
  // orderedList.classList.add('main-node');
  // if (isChild) {
  //   orderedList.classList.add('child-node');
  // }

  // 2. Sort the nodes based on their order property
  nodes.sort((a, b) => a.order - b.order);

  // 3. Iterate through each node to create <li> elements
  nodes.forEach(node => {
    const listItem = document.createElement('li');
    listItem.classList.add('list-container');
    listItem.setAttribute('draggable', 'true');


    // Removed
    // if (isChild) {
    //   listItem.classList.add('child-node')
    // }

    // Create an anchor tag (<a>) for the clickable heading
    const sectionLink = document.createElement('a');
    sectionLink.setAttribute('id', 'T-' + node.id);
    sectionLink.classList.add('section-link');
    sectionLink.classList.add('dynamic-item');

    //sectionLink.setAttribute('onclick', `registerTreeElementClick("${node.id}")`);  //OLD

    sectionLink.setAttribute('clickable', 'true');

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
      // console.log(`Depth of tree value is: ${depthOfTree}`);
      buildNestedList(node.children, listItem, true);
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



/**
 * Click Handling below:
 */


// I need an onclick function for the show-hide button that will toggle the hidden class on and off
function toggleDetails() {
  const details = document.querySelector('.revisions');
  details.classList.toggle('hidden');
}

// I need an onclick function for the expand-shrink button that will toggle the hidden class on and off for each revision item except the first one which should always be visible
function toggleRevisionList() {
  const revisions = document.querySelectorAll('.revision-item');
  // const revisions = document.querySelectorAll('[id^="revision-'); // This works too
  revisions.forEach((item, index) => {
    if (index !== 0) { // Skip the first item
      item.classList.toggle('hidden');
    }
  });
}


/**
 * 
 * @param {string} id - supplies whatever the clicked ID was 
 * 
 * TODO:
 * Use the id to search the list of entries
 * Load the id and title into the contentTitle area
 * Load the content into the textarea (currently has demonstrator code, but will need breaking)
 */
function registerTreeElementClick(id) {
  debugMessage(`Clicked Tree Element ID: ${id}`);

  //Search the documentstructure
  const foundNode = DocumentNode.searchMultipleRootsById(documentStructure, id);

  // Assign variable for building the Tile Title
  const sectionId = document.getElementById(`contentID`);
  const sectionTitle = document.getElementById(`contentTitle`);
  
  // Build the Heading
  sectionId.textContent = foundNode.id; // This updates a <h4> tag so must be a .textContent or .innerHTML
  sectionTitle.value = foundNode.name;  // This updates a <teaxtarea> so must use the .value property
  
  
  // Populate the TextBox
  //const sectionText = document.getElementById(`contentTitle`);
  // Populate the textarea
  //sectionText.textContent = foundNode.content;

  // debugMessage(`Searched for id ${id}, found: `, foundNode.id);
  // console.log(`Return object of: `,foundNode);

  const sectionDetail = '';

}










// Select the HTML elements we need to work with
const myList = document.getElementById('myList');
const myTextarea = document.getElementById('myTextarea');


// Function to handle adding the item to the list
function addListItem(existingText) {
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


/*
* TODO: 
*   Need to build out the logic in this section.
*/

/**
 * 
 * @param {*} revisionId 
 */

function viewRevision(revisionId) {
  console.log(`TODO: Implement viewRevision() logic, clicked: `, revisionId);
}

function revertDocument(revisionId) {
  console.log(`TODO: Implement revertDocument() logic, clicked: `, revisionId);
}

function unlockDocument(docId) {
  console.log(`TODO: Implement unlockDocument() logic, clicked: `, docId);
}

function saveDocument(docId) {
  console.log(`TODO: Implement saveDocument() logic, clicked: `, docId);
}

function commitDocument(docId) {
  console.log(`TODO: Implement commitDocument() logic, clicked: `, docId);
}

/**
 * Sets up a single event listener on a parent container 
 * to handle clicks on all dynamically generated children.
 * @param {string} parentId The ID of the static parent container (e.g., 'dynamic-container').
 * @param {string} targetClass The class shared by all dynamic children (e.g., 'dynamic-item').
 */
export function initializeDynamicClickHandler(parentId, targetClass) {
    
    const parentElement = document.getElementById(parentId);

    if (!parentElement) {
        console.error(`Parent element with ID '${parentId}' not found.`);
        return;
    }



    // Attach the single listener to the static parent
    parentElement.addEventListener('click', (event) => {
        
        // Use .closest() to check if the click target or any of its parents 
        // matches the targetClass. This handles clicks on text/spans inside the item.
        const clickedElement = event.target.closest(`.${targetClass}`);

        // Is this a general
        if (clickedElement) {
            // --- CORE LOGIC START ---
            
            const elementId = clickedElement.id;
            console.log(`Clicked ID: ${elementId}`);  //DEBUG


            //Is this a Tree (Document) Element
            if (elementId.startsWith('T-')) {
                
                const firstHyphenIndex = elementId.indexOf('-');
                const result = elementId.slice(firstHyphenIndex + 1);
                
                // Handle the Tree Click
                registerTreeElementClick(result);
                
            }

            // REVISIONS
            else if (elementId.startsWith('view-revision-')){
              // Temporary placeholder
              //console.log(`TODO: Build logic of viewRevision(n). Clicked id of: ${elementId} was clicked`);
              
              const revisionId = elementId.lastIndexOf('-');
              const resultId = elementId.slice(revisionId + 1);
              console.log(revisionId + " " + resultId);

              viewRevision(resultId);  // TODO
            }

            // REVERTS
            else if (elementId.startsWith('revert-to-document-')){
              // Temporary placeholder
              //console.log(`TODO: Build logic of viewRevision(n). Clicked id of: ${elementId} was clicked`);
              
              const documentId = elementId.lastIndexOf('-');
              const resultId = elementId.slice(documentId + 1);
              //console.log(revisionId + " " + resultId);

              revertDocument(resultId);  // TODO
            }


            else if (elementId.startsWith('revert-to-document-')){
              console.log(`TODO: Build logic of revertToDocument(n). Clicked id of: ${elementId} was clicked`);
            }

            else {
              switch(elementId){
                case "toggleDetails":
                  toggleDetails();                  
                break;

                case "toggleRevisionList":
                  toggleRevisionList();
                break;

                case "unlockDocument":
                  unlockDocument();
                  break;

                case "saveDocument":
                  saveDocument();
                  break;
                
                case "commitDocument":
                  commitDocument();
                  break;

              }
            };
            
            // --- CORE LOGIC END ---
        }
    });

    console.log(`Dynamic click handler initialized on #${parentId}`);
}


const titleTextarea = document.getElementById('contentTitle');  // Get the element within the Title section
let currentlyEditingItem = null;

function updateSourceData(itemId, newValue){
  console.log(`TODO: updateSourceData - should be saving edits for ID: ${itemId}`);
}

titleTextarea.addEventListener('input', (event) => {
  console.log(`Registered event within titleTeaxtarea with ID of ${event.target.id}: ${event.target.value}`);
  
  if (currentlyEditingItem) {
    // As the item is typed in, update the source of truth
    updateSourceData(currentlyEditingItem.id, event.target.value);
  }
});



// Example usage (inside script.js or another module)
document.addEventListener('DOMContentLoaded', () => {
    initializeDynamicClickHandler('dynamic-container', 'dynamic-item');
});

