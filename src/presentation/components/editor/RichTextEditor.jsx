import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Link } from '@tiptap/extension-link';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';

import EditorToolbar from './EditorToolbar';
import './editor.css';

export default function RichTextEditor({
  content = '',
  onChange,
  placeholder = 'Nhập nội dung chi tiết...',
  disabled = false,
  minHeight = '140px',
  className = ''
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: content || '',
    editable: !disabled,
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none',
        'data-placeholder': placeholder,
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (onChange) {
        const html = currentEditor.getHTML();
        // If user deleted everything and it's just an empty paragraph, send empty string
        const isEmpty = currentEditor.isEmpty;
        onChange(isEmpty ? '' : html);
      }
    },
  });

  // Synchronize content prop changes from outside (e.g. form reset, template change)
  useEffect(() => {
    if (!editor) return;

    const currentHtml = editor.getHTML();
    const incoming = content || '';

    // Only update if substantially different to avoid cursor jumps
    if (incoming !== currentHtml && (incoming !== '' || !editor.isEmpty)) {
      editor.commands.setContent(incoming, false);
    }
  }, [content, editor]);

  // Handle editable prop change
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={`tiptap-editor-wrapper ${disabled ? 'is-disabled' : ''} ${className}`}>
      {!disabled && <EditorToolbar editor={editor} />}
      <div className="tiptap-editor-content" style={{ minHeight }}>
        <EditorContent editor={editor} style={{ minHeight }} />
      </div>
    </div>
  );
}
