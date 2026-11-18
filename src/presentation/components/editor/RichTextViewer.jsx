import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import './editor.css';

// Configure DOMPurify hook to ensure all external links have secure attributes
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.hasAttribute('href')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
    'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'span', 'blockquote'
  ],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class'],
  ALLOW_DATA_ATTR: false,
};

export default function RichTextViewer({ content, className = '' }) {
  const isHtml = useMemo(() => {
    if (!content || typeof content !== 'string') return false;
    return /<[a-z][\s\S]*>/i.test(content);
  }, [content]);

  const sanitizedContent = useMemo(() => {
    if (!content || typeof content !== 'string') return '';
    if (!isHtml) return content;
    return DOMPurify.sanitize(content, PURIFY_CONFIG);
  }, [content, isHtml]);

  if (!content) {
    return null;
  }

  if (isHtml) {
    return (
      <div
        className={`tiptap-content text-slate-700 leading-relaxed ${className}`}
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />
    );
  }

  return (
    <p className={`whitespace-pre-line text-slate-700 leading-relaxed ${className}`}>
      {content}
    </p>
  );
}
