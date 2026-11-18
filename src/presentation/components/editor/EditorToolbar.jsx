import React, { useState, useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Unlink,
  Table as TableIcon,
  Undo,
  Redo,
  Palette,
  Plus,
  Trash2
} from 'lucide-react';

const COLOR_PALETTE = [
  { label: 'Mặc định', value: 'inherit' },
  { label: 'Đen', value: '#0f172a' },
  { label: 'Xám', value: '#64748b' },
  { label: 'Xanh dương', value: '#2563eb' },
  { label: 'Xanh lá', value: '#16a34a' },
  { label: 'Đỏ', value: '#dc2626' },
  { label: 'Cam', value: '#ea580c' },
  { label: 'Tím', value: '#9333ea' },
];

export default function EditorToolbar({ editor }) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const colorPickerRef = useRef(null);
  const tableMenuRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
        setShowColorPicker(false);
      }
      if (tableMenuRef.current && !tableMenuRef.current.contains(event.target)) {
        setShowTableMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Nhập địa chỉ liên kết (URL):', previousUrl || 'https://');
    if (url === null) return;
    if (url === '' || url === 'https://') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    setShowTableMenu(false);
  };

  const applyColor = (color) => {
    if (color === 'inherit') {
      editor.chain().focus().unsetColor().run();
    } else {
      editor.chain().focus().setColor(color).run();
    }
    setShowColorPicker(false);
  };

  const btnClass = (isActive) =>
    `p-1.5 rounded transition text-xs font-medium flex items-center justify-center hover:bg-slate-100 ${
      isActive ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs' : 'text-slate-600'
    }`;

  const isTableActive = editor.isActive('table');

  return (
    <div className="flex flex-wrap items-center gap-1 p-1.5 border-b border-slate-200 bg-slate-50/70 rounded-t-lg">
      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5 pr-1 border-r border-slate-200">
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className={`${btnClass(false)} disabled:opacity-30 disabled:cursor-not-allowed`}
          title="Hoàn tác (Ctrl+Z)"
        >
          <Undo size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className={`${btnClass(false)} disabled:opacity-30 disabled:cursor-not-allowed`}
          title="Làm lại (Ctrl+Y)"
        >
          <Redo size={15} />
        </button>
      </div>

      {/* Headings */}
      <div className="flex items-center gap-0.5 pr-1 border-r border-slate-200">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={btnClass(editor.isActive('heading', { level: 1 }))}
          title="Tiêu đề 1"
        >
          <Heading1 size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={btnClass(editor.isActive('heading', { level: 2 }))}
          title="Tiêu đề 2"
        >
          <Heading2 size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={btnClass(editor.isActive('heading', { level: 3 }))}
          title="Tiêu đề 3"
        >
          <Heading3 size={15} />
        </button>
      </div>

      {/* Inline styles: Bold, Italic, Underline, Strike */}
      <div className="flex items-center gap-0.5 pr-1 border-r border-slate-200">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={btnClass(editor.isActive('bold'))}
          title="In đậm (Ctrl+B)"
        >
          <Bold size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btnClass(editor.isActive('italic'))}
          title="In nghiêng (Ctrl+I)"
        >
          <Italic size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={btnClass(editor.isActive('underline'))}
          title="Gạch chân (Ctrl+U)"
        >
          <UnderlineIcon size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={btnClass(editor.isActive('strike'))}
          title="Gạch ngang"
        >
          <Strikethrough size={15} />
        </button>
      </div>

      {/* Color picker */}
      <div className="relative pr-1 border-r border-slate-200" ref={colorPickerRef}>
        <button
          type="button"
          onClick={() => setShowColorPicker(!showColorPicker)}
          className={btnClass(false)}
          title="Màu chữ"
        >
          <Palette size={15} />
        </button>

        {showColorPicker && (
          <div className="absolute top-full left-0 mt-1 z-30 p-2 bg-white rounded-md shadow-lg border border-slate-200 grid grid-cols-4 gap-1.5 w-36">
            {COLOR_PALETTE.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => applyColor(item.value)}
                className="w-6 h-6 rounded-full border border-slate-300 flex items-center justify-center hover:scale-110 transition"
                style={{ backgroundColor: item.value === 'inherit' ? '#ffffff' : item.value }}
                title={item.label}
              >
                {item.value === 'inherit' && <span className="text-[10px] text-slate-500 font-bold">✕</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lists */}
      <div className="flex items-center gap-0.5 pr-1 border-r border-slate-200">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btnClass(editor.isActive('bulletList'))}
          title="Danh sách gạch đầu dòng"
        >
          <List size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btnClass(editor.isActive('orderedList'))}
          title="Danh sách đánh số"
        >
          <ListOrdered size={15} />
        </button>
      </div>

      {/* Alignment */}
      <div className="flex items-center gap-0.5 pr-1 border-r border-slate-200">
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={btnClass(editor.isActive({ textAlign: 'left' }))}
          title="Căn trái"
        >
          <AlignLeft size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={btnClass(editor.isActive({ textAlign: 'center' }))}
          title="Căn giữa"
        >
          <AlignCenter size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={btnClass(editor.isActive({ textAlign: 'right' }))}
          title="Căn phải"
        >
          <AlignRight size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={btnClass(editor.isActive({ textAlign: 'justify' }))}
          title="Căn đều"
        >
          <AlignJustify size={15} />
        </button>
      </div>

      {/* Links */}
      <div className="flex items-center gap-0.5 pr-1 border-r border-slate-200">
        <button
          type="button"
          onClick={setLink}
          className={btnClass(editor.isActive('link'))}
          title="Chèn liên kết"
        >
          <LinkIcon size={15} />
        </button>
        {editor.isActive('link') && (
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetLink().run()}
            className={btnClass(false)}
            title="Bỏ liên kết"
          >
            <Unlink size={15} />
          </button>
        )}
      </div>

      {/* Table Menu */}
      <div className="relative" ref={tableMenuRef}>
        <button
          type="button"
          onClick={() => setShowTableMenu(!showTableMenu)}
          className={btnClass(isTableActive)}
          title="Bảng biểu"
        >
          <TableIcon size={15} />
        </button>

        {showTableMenu && (
          <div className="absolute top-full left-0 mt-1 z-30 p-1.5 bg-white rounded-md shadow-lg border border-slate-200 flex flex-col gap-1 w-48 text-xs text-slate-700">
            {!isTableActive ? (
              <button
                type="button"
                onClick={insertTable}
                className="w-full text-left px-2 py-1.5 hover:bg-slate-100 rounded flex items-center gap-1.5"
              >
                <Plus size={13} /> Chèn bảng (3x3)
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => { editor.chain().focus().addRowBefore().run(); setShowTableMenu(false); }}
                  className="w-full text-left px-2 py-1 hover:bg-slate-100 rounded"
                >
                  + Thêm hàng phía trên
                </button>
                <button
                  type="button"
                  onClick={() => { editor.chain().focus().addRowAfter().run(); setShowTableMenu(false); }}
                  className="w-full text-left px-2 py-1 hover:bg-slate-100 rounded"
                >
                  + Thêm hàng phía dưới
                </button>
                <button
                  type="button"
                  onClick={() => { editor.chain().focus().deleteRow().run(); setShowTableMenu(false); }}
                  className="w-full text-left px-2 py-1 hover:bg-slate-100 rounded text-red-600"
                >
                  - Xóa hàng hiện tại
                </button>
                <div className="border-t border-slate-100 my-0.5" />
                <button
                  type="button"
                  onClick={() => { editor.chain().focus().addColumnBefore().run(); setShowTableMenu(false); }}
                  className="w-full text-left px-2 py-1 hover:bg-slate-100 rounded"
                >
                  + Thêm cột bên trái
                </button>
                <button
                  type="button"
                  onClick={() => { editor.chain().focus().addColumnAfter().run(); setShowTableMenu(false); }}
                  className="w-full text-left px-2 py-1 hover:bg-slate-100 rounded"
                >
                  + Thêm cột bên phải
                </button>
                <button
                  type="button"
                  onClick={() => { editor.chain().focus().deleteColumn().run(); setShowTableMenu(false); }}
                  className="w-full text-left px-2 py-1 hover:bg-slate-100 rounded text-red-600"
                >
                  - Xóa cột hiện tại
                </button>
                <div className="border-t border-slate-100 my-0.5" />
                <button
                  type="button"
                  onClick={() => { editor.chain().focus().deleteTable().run(); setShowTableMenu(false); }}
                  className="w-full text-left px-2 py-1 hover:bg-red-50 rounded text-red-600 font-medium flex items-center gap-1.5"
                >
                  <Trash2 size={13} /> Xóa toàn bộ bảng
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
