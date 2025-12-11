/*
// =========================================================================
// PRINT FORMATTER MODULE
// Handles PDF/Print export functionality
// =========================================================================
*/

/**
 * Exports the current document to PDF format
 * @param {Object} documentStructure - The document structure from state manager
 * @param {string} documentTitle - Title of the document
 * @param {string} documentSubtitle - Subtitle/description of the document
 */
export function exportToPDF(documentStructure, documentTitle, documentSubtitle) {
    // Prompt for orientation
    const orientation = prompt('Choose orientation:\n1 = Portrait\n2 = Landscape', '1');
    const isLandscape = orientation === '2';
    
    // Generate the print HTML
    const printHTML = generatePrintHTML(documentStructure, documentTitle, documentSubtitle, isLandscape);
    
    // Create a hidden iframe for printing
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.top = '-10000px';
    printFrame.style.left = '-10000px';
    document.body.appendChild(printFrame);
    
    // Write the HTML to the iframe
    const printDocument = printFrame.contentDocument || printFrame.contentWindow.document;
    printDocument.open();
    printDocument.write(printHTML);
    printDocument.close();
    
    // Wait for content to load, then trigger print
    printFrame.contentWindow.onload = function() {
        setTimeout(() => {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
            
            // Clean up after printing
            setTimeout(() => {
                document.body.removeChild(printFrame);
            }, 1000);
        }, 250);
    };
}

/**
 * Generates the complete HTML for printing
 */
function generatePrintHTML(documentStructure, title, subtitle, isLandscape) {
    const orientation = isLandscape ? 'landscape' : 'portrait';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        ${getPrintStyles(isLandscape)}
    </style>
</head>
<body>
    <div class="print-header">
        <h1 class="print-title">${title}</h1>
        ${subtitle ? `<p class="print-subtitle">${subtitle}</p>` : ''}
        <p class="print-date">Generated: ${new Date().toLocaleDateString()}</p>
    </div>
    
    <div class="print-content">
        ${generateNodeHTML(Array.isArray(documentStructure) ? documentStructure : (documentStructure.children || []), 1)}
    </div>
</body>
</html>
    `;
}

/**
 * Recursively generates HTML for document nodes
 * @param {Array} nodes - Array of nodes to render
 * @param {number} level - Current nesting level
 * @param {string} parentNumber - Parent's section number
 */
function generateNodeHTML(nodes, level = 1, parentNumber = '') {
    if (!nodes || nodes.length === 0) {
        console.log('DEBUG: No nodes to render at level', level);
        return '';
    }
    
    console.log('DEBUG: Rendering', nodes.length, 'nodes at level', level);
    
    let html = '';
    
    nodes.forEach((node, index) => {
        console.log('DEBUG: Processing node:', node.title || node.name, 'Content:', node.content ? 'YES' : 'NO', 'Children:', node.children?.length || 0);
        
        // Calculate section number
        const currentNumber = index + 1;
        const sectionNumber = parentNumber 
            ? `${parentNumber}.${currentNumber}` 
            : `${currentNumber}`;
        
        // Start section div
        html += `<div class="print-section level-${level}">`;
        
        // Add section title (handle both 'title' and 'name' properties)
        const nodeTitle = node.title || node.name || 'Untitled';
        const headingLevel = Math.min(level + 1, 6);
        html += `<h${headingLevel} class="print-section-title">`;
        html += `<span class="section-number">${sectionNumber}</span>`;
        html += `${nodeTitle}`;
        html += `</h${headingLevel}>`;
        
        // Add section content (paragraphs with letter numbering)
        if (node.content) {
            html += `<div class="print-section-content">`;
            const paragraphs = formatTextContent(node.content);
            console.log('DEBUG: Content paragraphs:', paragraphs.length);
            
            paragraphs.forEach((paragraph, pIndex) => {
                if (paragraph.trim()) {
                    const letter = String.fromCharCode(97 + pIndex); // a, b, c...
                    html += `<div class="print-paragraph">`;
                    html += `<span class="paragraph-number">${sectionNumber}${letter}</span>`;
                    html += paragraph;
                    html += `</div>`;
                }
            });
            
            html += `</div>`;
        }
        
        // Recursively add child nodes
        if (node.children && node.children.length > 0) {
            html += `<div class="print-subsections">`;
            html += generateNodeHTML(node.children, level + 1, sectionNumber);
            html += `</div>`;
        }
        
        html += `</div>`;
    });
    
    return html;
}

/**
 * Formats text content into paragraphs
 */
function formatTextContent(text) {
    if (!text) return [];
    
    // Handle both array and string formats
    if (Array.isArray(text)) {
        return text.filter(p => p && p.trim());
    }
    
    // Split by double line breaks or single line breaks
    return text.split(/\n\n|\n/)
        .map(p => p.trim())
        .filter(p => p);
}

/**
 * Returns CSS styles for print layout
 */
function getPrintStyles(isLandscape) {
    const pageWidth = isLandscape ? '10in' : '6.5in';
    const orientation = isLandscape ? 'landscape' : 'portrait';
    
    return `
        @page {
            size: letter ${orientation};
            margin: 1in;
        }
        
        @page {
            @bottom-center {
                content: "Page " counter(page) " of " counter(pages);
                font-size: 10pt;
                color: #666;
            }
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #000;
            max-width: ${pageWidth};
            margin: 0 auto;
        }
        
        /* Header */
        .print-header {
            margin-bottom: 2em;
            page-break-after: avoid;
        }
        
        .print-title {
            font-size: 24pt;
            font-weight: bold;
            margin-bottom: 0.5em;
        }
        
        .print-subtitle {
            font-size: 14pt;
            color: #333;
            margin-bottom: 0.5em;
        }
        
        .print-date {
            font-size: 10pt;
            color: #666;
        }
        
        /* Content sections */
        .print-content {
            margin-top: 1em;
        }
        
        .print-section {
            margin-bottom: 1.5em;
            page-break-inside: avoid;
        }
        
        .print-section.level-1 {
            margin-bottom: 2em;
        }
        
        .print-section.level-2,
        .print-section.level-3,
        .print-section.level-4 {
            margin-left: 0;
        }
        
        .print-section.level-5,
        .print-section.level-6 {
            margin-left: 0;
        }
        
        /* Section titles */
        .print-section-title {
            font-weight: bold;
            margin-bottom: 0.5em;
            color: #000;
            page-break-after: avoid;
        }
        
        h2.print-section-title {
            font-size: 18pt;
            margin-top: 0.5em;
        }
        
        h3.print-section-title {
            font-size: 16pt;
        }
        
        h4.print-section-title {
            font-size: 14pt;
        }
        
        h5.print-section-title,
        h6.print-section-title {
            font-size: 12pt;
        }
        
        .section-number {
            color: #666;
            margin-right: 0.3em;
        }
        
        /* Content paragraphs */
        .print-section-content {
            margin-bottom: 1em;
            page-break-inside: avoid;
        }
        
        .print-paragraph {
            margin-bottom: 0.5em;
            margin-left: 0.25in;
            padding-left: 0;
            text-indent: 0;
            text-align: justify;
            hyphens: auto;
        }
        
        .paragraph-number {
            color: #999;
            font-size: 0.9em;
            margin-right: 0.3em;
            font-weight: normal;
            display: inline;
        }
        
        .print-subsections {
            margin-top: 1em;
        }
        
        /* Print-specific */
        @media print {
            body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
            
            .print-section {
                page-break-inside: avoid;
            }
            
            .print-section-title {
                page-break-after: avoid;
            }
            
            .print-section-content {
                page-break-inside: avoid;
            }
        }
    `;
}
