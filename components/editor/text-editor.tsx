"use client";
import { useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, Underline, Check } from "lucide-react";
import {
  FONTS,
  richTextSchema,
  type Block,
  type RichText,
} from "@/lib/document";
import { Modal, IconButton, Notice } from "../ui";

export function TextEditor({
  block,
  onDone,
  onCancel,
  onDraft,
}: {
  block: Block;
  onDone: (text: RichText) => void;
  onCancel: () => void;
  onDraft: (text: RichText) => void;
}) {
  const content = useRef(block.content!);
  const [error, setError] = useState("");
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: false,
        strike: false,
        dropcursor: false,
        gapcursor: false,
        trailingNode: false,
      }),
    ],
    content: block.content,
    autofocus: "end",
    onUpdate: ({ editor }) => {
      const parsed = richTextSchema.safeParse(editor.getJSON());
      if (parsed.success) {
        content.current = parsed.data;
        onDraft(parsed.data);
        setError("");
      } else
        setError(
          "Ce texte dépasse les limites d’un bloc (300 paragraphes et 30 000 caractères par fragment). Copiez-en une partie dans un autre bloc avant d’appliquer.",
        );
    },
  });
  return (
    <Modal
      title="Les mots de votre carnet"
      onClose={() => {
        if (!error) onDone(content.current);
      }}
      wide
    >
      <p className="muted">
        Modifiez le contenu ici, puis retrouvez sa mise en page dans le carnet.
        Ctrl+Z annule la saisie dans ce champ. Votre texte est aussi sauvegardé
        pendant la saisie.
      </p>
      {error && <Notice error>{error}</Notice>}
      <div className="text-edit-toolbar">
        <IconButton
          label="Gras sur la sélection"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold size={17} />
        </IconButton>
        <IconButton
          label="Italique sur la sélection"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic size={17} />
        </IconButton>
        <IconButton
          label="Souligner la sélection"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <Underline size={17} />
        </IconButton>
      </div>
      <div
        className="rich-text-editor"
        style={{
          fontFamily: FONTS[block.style.font],
          fontSize: Math.min(22, block.style.fontSize),
          color: "#3c4239",
          lineHeight: block.style.lineHeight,
        }}
      >
        <EditorContent editor={editor} />
      </div>
      <div className="modal-actions">
        <button className="button secondary" onClick={onCancel}>
          Annuler
        </button>
        <button
          className="button primary"
          disabled={!!error}
          onClick={() => onDone(content.current)}
        >
          <Check size={16} />
          Appliquer le texte
        </button>
      </div>
    </Modal>
  );
}
