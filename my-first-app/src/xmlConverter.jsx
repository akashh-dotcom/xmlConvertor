import React, { useState, useEffect, useRef } from 'react';
import { FileText, Code, Download, Upload, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Image as ImageIcon, Table, Link as LinkIcon, Scissors, Strikethrough, Heading1, Heading2, Heading3, Quote, Minus, Eraser, RotateCcw, RotateCw } from 'lucide-react';

const XMLHTMLEditor = () => {
  const [xmlContent, setXmlContent] = useState(`<?xml version="1.0" encoding="UTF-8"?>
<document>
  <page number="1">
    <title>Sample Document - Page 1</title>
    <section>
      <heading>Introduction</heading>
      <paragraph>This is a <bold>sample paragraph</bold> with some <italic>formatted text</italic>.</paragraph>
      <image src="https://via.placeholder.com/400x200" alt="Sample Image"/>
    </section>
    <section>
      <heading>Features Table</heading>
      <table>
        <row>
          <cell>Feature</cell>
          <cell>Description</cell>
        </row>
        <row>
          <cell>XML to HTML</cell>
          <cell>Real-time conversion</cell>
        </row>
        <row>
          <cell>Visual Editing</cell>
          <cell>Word-like interface</cell>
        </row>
      </table>
    </section>
  </page>
  <page number="2">
    <title>Sample Document - Page 2</title>
    <section>
      <heading>Features List</heading>
      <list>
        <item>XML to HTML conversion</item>
        <item>Real-time editing</item>
        <item>Automatic synchronization</item>
        <item>Page break support</item>
      </list>
    </section>
    <section>
      <heading>Additional Information</heading>
      <paragraph>This content is on page 2. You can add as many pages as you need.</paragraph>
    </section>
  </page>
</document>`);

  const [htmlContent, setHtmlContent] = useState('');
  const editorRef = useRef(null);
  const [isUpdatingFromXml, setIsUpdatingFromXml] = useState(false);
  const isUpdatingFromHtmlRef = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const debounceTimerRef = useRef(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Convert XML to HTML with support for pages, tables and images
  const xmlToHtml = (xml) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xml, 'text/xml');
      
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        return '<div style="color: red;">Invalid XML</div>';
      }

      const convertNode = (node, isPageContent = false) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent.trim();
          return text ? text : '';
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
          const tagName = node.tagName.toLowerCase();
          
          // Process children
          const children = Array.from(node.childNodes)
            .map(child => convertNode(child, tagName === 'page'))
            .filter(content => content);

          const tagMap = {
            'document': 'div',
            'page': 'div',
            'title': 'h1',
            'section': 'section',
            'heading': 'h2',
            'paragraph': 'p',
            'bold': 'strong',
            'italic': 'em',
            'underline': 'u',
            'list': 'ul',
            'item': 'li',
            'table': 'table',
            'row': 'tr',
            'cell': 'td',
            'image': 'img',
            'link': 'a'
          };

          const htmlTag = tagMap[tagName] || 'div';
          
          // Handle attributes
          let attrs = '';
          if (node.attributes && node.attributes.length > 0) {
            Array.from(node.attributes).forEach(attr => {
              attrs += ` ${attr.name}="${attr.value}"`;
            });
          }

          // Special handling for page elements
          if (htmlTag === 'div' && tagName === 'page') {
            const pageNum = node.getAttribute('number') || '1';
            const childrenHTML = children.join('');
            return `<div class="page" data-page="${pageNum}" style="
              page-break-after: always;
              page-break-inside: avoid;
              min-height: 800px;
              padding: 40px;
              margin-bottom: 20px;
              background: white;
              border: 1px solid #ddd;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              position: relative;
            ">
              <div style="position: absolute; top: 10px; right: 20px; color: #999; font-size: 12px;">Page ${pageNum}</div>
              ${childrenHTML}
            </div>`;
          }

          // Self-closing tags (images)
          if (htmlTag === 'img') {
            return `<${htmlTag}${attrs} style="max-width: 100%; height: auto; margin: 10px 0; display: block;" />`;
          }

          // Special handling for tables
          if (htmlTag === 'table') {
            const childrenHTML = children.join('');
            return `<table border="1" style="border-collapse: collapse; width: 100%; margin: 15px 0;">${childrenHTML}</table>`;
          }

          if (htmlTag === 'tr') {
            const childrenHTML = children.join('');
            return `<tr>${childrenHTML}</tr>`;
          }

          if (htmlTag === 'td') {
            const childrenHTML = children.join('');
            return `<td style="border: 1px solid #ddd; padding: 8px;">${childrenHTML}</td>`;
          }

          const childrenHTML = children.join('');
          return `<${htmlTag}${attrs}>${childrenHTML}</${htmlTag}>`;
        }

        return '';
      };

      const result = convertNode(xmlDoc.documentElement);
      return result;
    } catch (error) {
      console.error('XML parsing error:', error);
      return '<div style="color: red;">Error parsing XML</div>';
    }
  };

  // Convert HTML back to XML with support for pages, tables and images
  const htmlToXml = (html) => {
    try {
      const parser = new DOMParser();
      const htmlDoc = parser.parseFromString(html, 'text/html');
      
      const convertNode = (node, depth = 1) => {
        const indent = '  '.repeat(depth);
        
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent.trim();
          if (text && text !== 'Page') { // Skip page number labels
            return text
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
          }
          return '';
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
          const tagName = node.tagName.toLowerCase();
          
          const tagMap = {
            'div': node.classList.contains('page') ? 'page' : 'document',
            'h1': 'title',
            'section': 'section',
            'h2': 'heading',
            'p': 'paragraph',
            'strong': 'bold',
            'b': 'bold',
            'em': 'italic',
            'i': 'italic',
            'u': 'underline',
            'ul': 'list',
            'ol': 'list',
            'li': 'item',
            'table': 'table',
            'tbody': 'tablebody',
            'tr': 'row',
            'td': 'cell',
            'th': 'cell',
            'img': 'image',
            'a': 'link'
          };

          const xmlTag = tagMap[tagName] || tagName;
          
          // Skip body and html tags
          if (tagName === 'body' || tagName === 'html') {
            const children = Array.from(node.childNodes)
              .map(child => convertNode(child, depth))
              .filter(content => content)
              .join('\n');
            return children;
          }

          // Skip tbody
          if (tagName === 'tbody') {
            const children = Array.from(node.childNodes)
              .map(child => convertNode(child, depth))
              .filter(content => content)
              .join('\n');
            return children;
          }

          // Handle page divs specially
          let attrs = '';
          if (xmlTag === 'page') {
            const pageNum = node.getAttribute('data-page') || '1';
            attrs = ` number="${pageNum}"`;
          } else if (node.attributes && node.attributes.length > 0) {
            Array.from(node.attributes).forEach(attr => {
              if (attr.name === 'src' || attr.name === 'href' || attr.name === 'alt' || attr.name === 'title') {
                attrs += ` ${attr.name}="${attr.value}"`;
              }
            });
          }

          const children = Array.from(node.childNodes)
            .map(child => convertNode(child, depth + 1))
            .filter(content => content);

          // Self-closing for images
          if (xmlTag === 'image') {
            return `${indent}<${xmlTag}${attrs}/>`;
          }

          // Empty elements
          if (children.length === 0) {
            return `${indent}<${xmlTag}${attrs}/>`;
          }

          const hasElementChildren = Array.from(node.childNodes).some(
            child => child.nodeType === Node.ELEMENT_NODE
          );

          if (hasElementChildren) {
            const childrenXml = children.join('\n');
            return `${indent}<${xmlTag}${attrs}>\n${childrenXml}\n${indent}</${xmlTag}>`;
          } else {
            const childrenXml = children.join('');
            return `${indent}<${xmlTag}${attrs}>${childrenXml}</${xmlTag}>`;
          }
        }

        return '';
      };

      const bodyContent = htmlDoc.body;
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += convertNode(bodyContent, 0);
      
      return xml;
    } catch (error) {
      console.error('Conversion error:', error);
      return xmlContent;
    }
  };

  // Initialize HTML on mount
  useEffect(() => {
    const html = xmlToHtml(xmlContent);
    setHtmlContent(html);
    setIsInitialized(true);
  }, []);

  // Update HTML when XML changes (after initialization)
  useEffect(() => {
    if (isInitialized && !isUpdatingFromXml && !isUpdatingFromHtmlRef.current) {
      setIsUpdatingFromXml(true);
      const html = xmlToHtml(xmlContent);
      setHtmlContent(html);

      // Reset flag after state update
      setTimeout(() => setIsUpdatingFromXml(false), 0);
    }
  }, [xmlContent, isInitialized]);

  // Update the editor content when HTML changes
  useEffect(() => {
    if (editorRef.current && htmlContent) {
      // Only update if content is different to avoid cursor issues
      if (editorRef.current.innerHTML !== htmlContent) {
        editorRef.current.innerHTML = htmlContent;
      }
    }
  }, [htmlContent]);

  // Handle HTML editor input - this updates XML from HTML with debouncing
  const handleHtmlInput = (e, immediate = false) => {
    console.log('handleHtmlInput called', { isUpdatingFromXml, immediate });

    if (!isUpdatingFromXml) {
      const newHtml = e.currentTarget.innerHTML;
      console.log('Processing HTML input, length:', newHtml.length);

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      const updateXml = () => {
        console.log('updateXml starting...');
        setIsSyncing(true);
        isUpdatingFromHtmlRef.current = true;

        const newXml = htmlToXml(newHtml);
        console.log('Converted to XML, length:', newXml.length);

        try {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(newXml, 'text/xml');
          const parserError = xmlDoc.querySelector('parsererror');

          if (!parserError) {
            console.log('Updating XML content...');
            setXmlContent(newXml);
          } else {
            console.error('XML parsing error detected');
          }
        } catch (error) {
          console.error('XML validation error:', error);
        }

        // Reset flags after update completes
        setTimeout(() => {
          isUpdatingFromHtmlRef.current = false;
          setIsSyncing(false);
          console.log('Flags reset, sync complete');
        }, 50);
      };

      // Use immediate update for toolbar actions, debounced for typing
      if (immediate) {
        console.log('Immediate update');
        updateXml();
      } else {
        console.log('Debounced update (300ms)');
        // Debounce typing for better performance (300ms delay)
        debounceTimerRef.current = setTimeout(updateXml, 300);
      }
    } else {
      console.log('Skipping - isUpdatingFromXml is true');
    }
  };

  // Toolbar functions
  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current.focus();
    setTimeout(() => handleHtmlInput({ currentTarget: editorRef.current }, true), 10);
  };

  const insertTable = () => {
    const rows = prompt('Number of rows:', '3');
    const cols = prompt('Number of columns:', '3');
    
    if (rows && cols) {
      let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%; margin: 15px 0;">';
      for (let i = 0; i < parseInt(rows); i++) {
        tableHTML += '<tr>';
        for (let j = 0; j < parseInt(cols); j++) {
          tableHTML += '<td style="border: 1px solid #ddd; padding: 8px;">Cell</td>';
        }
        tableHTML += '</tr>';
      }
      tableHTML += '</table>';

      document.execCommand('insertHTML', false, tableHTML);
      setTimeout(() => handleHtmlInput({ currentTarget: editorRef.current }, true), 10);
    }
  };

  const insertImage = () => {
    const url = prompt('Enter image URL:', 'https://via.placeholder.com/400x200');
    if (url) {
      const imgHTML = `<img src="${url}" alt="Image" style="max-width: 100%; height: auto; margin: 10px 0; display: block;" />`;
      document.execCommand('insertHTML', false, imgHTML);
      setTimeout(() => handleHtmlInput({ currentTarget: editorRef.current }, true), 10);
    }
  };

  const insertLink = () => {
    const url = prompt('Enter URL:', 'https://');
    if (url) {
      document.execCommand('createLink', false, url);
      setTimeout(() => handleHtmlInput({ currentTarget: editorRef.current }, true), 10);
    }
  };

  const insertPageBreak = () => {
    // Count existing pages
    const pages = editorRef.current.querySelectorAll('.page');
    const nextPageNum = pages.length + 1;
    
    const pageHTML = `<div class="page" data-page="${nextPageNum}" style="
      page-break-after: always;
      page-break-inside: avoid;
      min-height: 800px;
      padding: 40px;
      margin-bottom: 20px;
      background: white;
      border: 1px solid #ddd;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      position: relative;
    ">
      <div style="position: absolute; top: 10px; right: 20px; color: #999; font-size: 12px;">Page ${nextPageNum}</div>
      <h1>Page ${nextPageNum} Content</h1>
      <p>Start typing here...</p>
    </div>`;

    document.execCommand('insertHTML', false, pageHTML);
    setTimeout(() => handleHtmlInput({ currentTarget: editorRef.current }, true), 10);
  };

  // Additional formatting functions
  const formatAsHeading = (level) => {
    const tag = `h${level}`;
    document.execCommand('formatBlock', false, tag);
    setTimeout(() => handleHtmlInput({ currentTarget: editorRef.current }, true), 10);
  };

  const insertBlockquote = () => {
    document.execCommand('formatBlock', false, 'blockquote');
    setTimeout(() => handleHtmlInput({ currentTarget: editorRef.current }, true), 10);
  };

  const insertHorizontalRule = () => {
    document.execCommand('insertHorizontalRule', false, null);
    setTimeout(() => handleHtmlInput({ currentTarget: editorRef.current }, true), 10);
  };

  const clearFormatting = () => {
    document.execCommand('removeFormat', false, null);
    setTimeout(() => handleHtmlInput({ currentTarget: editorRef.current }, true), 10);
  };

  const undoEdit = () => {
    document.execCommand('undo', false, null);
    setTimeout(() => handleHtmlInput({ currentTarget: editorRef.current }, true), 10);
  };

  const redoEdit = () => {
    document.execCommand('redo', false, null);
    setTimeout(() => handleHtmlInput({ currentTarget: editorRef.current }, true), 10);
  };

  // Download functions
  const downloadXml = () => {
    const blob = new Blob([xmlContent], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.xml';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadHtml = () => {
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .page {
      page-break-after: always;
      page-break-inside: avoid;
      min-height: 800px;
      padding: 40px;
      margin-bottom: 20px;
      background: white;
      border: 1px solid #ddd;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      position: relative;
    }
    .page:last-child {
      page-break-after: auto;
    }
    h1 { color: #2c3e50; margin-bottom: 20px; }
    h2 { color: #34495e; margin-top: 30px; }
    p { margin: 15px 0; }
    ul { margin: 15px 0; padding-left: 30px; }
    li { margin: 8px 0; }
    table { border-collapse: collapse; width: 100%; margin: 15px 0; }
    td, th { border: 1px solid #ddd; padding: 8px; }
    img { max-width: 100%; height: auto; margin: 10px 0; display: block; }
    @media print {
      body { background: white; padding: 0; }
      .page { 
        box-shadow: none; 
        border: none;
        margin: 0;
        padding: 40px;
      }
    }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;
    
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Document</title>
        <style>
          @page {
            size: A4;
            margin: 0;
          }
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
          }
          .page {
            page-break-after: always;
            page-break-inside: avoid;
            min-height: 100vh;
            padding: 40px;
            position: relative;
          }
          .page:last-child {
            page-break-after: auto;
          }
          h1 { color: #2c3e50; margin-bottom: 20px; }
          h2 { color: #34495e; margin-top: 30px; }
          p { margin: 15px 0; }
          ul { margin: 15px 0; padding-left: 30px; }
          li { margin: 8px 0; }
          table { border-collapse: collapse; width: 100%; margin: 15px 0; page-break-inside: avoid; }
          td, th { border: 1px solid #ddd; padding: 8px; }
          img { max-width: 100%; height: auto; margin: 10px 0; display: block; page-break-inside: avoid; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setXmlContent(e.target.result);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Code className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">XML to HTML Editor with Pages</h1>
                <p className="text-gray-600 text-sm">Edit HTML visually with pagination support - Bidirectional sync enabled</p>
              </div>
            </div>
            <div className="flex gap-2">
              <label className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 cursor-pointer flex items-center gap-2 transition-colors">
                <Upload className="w-4 h-4" />
                Upload XML
                <input
                  type="file"
                  accept=".xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <button
                onClick={downloadXml}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                XML
              </button>
              <button
                onClick={downloadHtml}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                HTML
              </button>
              <button
                onClick={downloadPdf}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                PDF
              </button>
            </div>
          </div>
        </div>

        {/* Editor Grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* XML Editor */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-3 flex items-center gap-2">
              <Code className="w-5 h-5 text-white" />
              <h2 className="text-white font-semibold">XML Code</h2>
            </div>
            <div className="flex-1 p-4">
              <textarea
                value={xmlContent}
                onChange={(e) => setXmlContent(e.target.value)}
                className="w-full h-full min-h-[600px] font-mono text-sm bg-gray-50 border border-gray-200 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                spellCheck="false"
              />
            </div>
          </div>

          {/* HTML Visual Editor */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-white" />
                <h2 className="text-white font-semibold">Visual Editor</h2>
              </div>
              {isSyncing && (
                <div className="flex items-center gap-2 text-white text-xs">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span>Syncing...</span>
                </div>
              )}
            </div>
            
            {/* Toolbar */}
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex flex-wrap gap-1">
              <button
                onClick={() => execCommand('bold')}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Bold (Ctrl+B)"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                onClick={() => execCommand('italic')}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Italic (Ctrl+I)"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                onClick={() => execCommand('underline')}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Underline (Ctrl+U)"
              >
                <Underline className="w-4 h-4" />
              </button>
              <button
                onClick={() => execCommand('strikeThrough')}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Strikethrough"
              >
                <Strikethrough className="w-4 h-4" />
              </button>

              <div className="w-px bg-gray-300 mx-1"></div>

              {/* Heading Levels */}
              <button
                onClick={() => formatAsHeading(1)}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Heading 1"
              >
                <Heading1 className="w-4 h-4" />
              </button>
              <button
                onClick={() => formatAsHeading(2)}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Heading 2"
              >
                <Heading2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => formatAsHeading(3)}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Heading 3"
              >
                <Heading3 className="w-4 h-4" />
              </button>

              <div className="w-px bg-gray-300 mx-1"></div>
              
              <button
                onClick={() => execCommand('justifyLeft')}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Align Left"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => execCommand('justifyCenter')}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Align Center"
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                onClick={() => execCommand('justifyRight')}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Align Right"
              >
                <AlignRight className="w-4 h-4" />
              </button>
              
              <div className="w-px bg-gray-300 mx-1"></div>
              
              <button
                onClick={() => execCommand('insertUnorderedList')}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Bullet List"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => execCommand('insertOrderedList')}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Numbered List"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                onClick={insertBlockquote}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Insert Blockquote"
              >
                <Quote className="w-4 h-4" />
              </button>
              <button
                onClick={insertHorizontalRule}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Insert Horizontal Line"
              >
                <Minus className="w-4 h-4" />
              </button>

              <div className="w-px bg-gray-300 mx-1"></div>
              
              <button
                onClick={insertTable}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Insert Table"
              >
                <Table className="w-4 h-4" />
              </button>
              <button
                onClick={insertImage}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Insert Image"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                onClick={insertLink}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Insert Link"
              >
                <LinkIcon className="w-4 h-4" />
              </button>

              <div className="w-px bg-gray-300 mx-1"></div>

              {/* Utility Tools */}
              <button
                onClick={clearFormatting}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Clear Formatting"
              >
                <Eraser className="w-4 h-4" />
              </button>
              <button
                onClick={undoEdit}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Undo (Ctrl+Z)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={redoEdit}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Redo (Ctrl+Y)"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              <div className="w-px bg-gray-300 mx-1"></div>

              <button
                onClick={insertPageBreak}
                className="p-2 hover:bg-gray-200 rounded transition-colors bg-blue-100"
                title="Insert New Page"
              >
                <Scissors className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-auto">
              <div
                ref={editorRef}
                contentEditable={true}
                suppressContentEditableWarning={true}
                onInput={handleHtmlInput}
                className="w-full min-h-[550px]"
                style={{
                  lineHeight: '1.6',
                }}
              >
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">How to Use Pages:</h3>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              <span><strong>Bidirectional Sync:</strong> Changes in the HTML editor automatically update the XML code, and vice versa.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              <span><strong>Page Breaks:</strong> Click the scissors icon (✂️) to insert a new page. Content is divided into separate pages.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              <span><strong>Page Numbers:</strong> Each page shows its number in the top-right corner.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              <span><strong>Print/PDF:</strong> When you download PDF, each page will print on a separate sheet.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              <span><strong>XML Structure:</strong> Use &lt;page number="1"&gt;...&lt;/page&gt; tags to define pages.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              <span><strong>Edit Pages:</strong> Click inside any page to edit content. Each page is independent.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default XMLHTMLEditor;