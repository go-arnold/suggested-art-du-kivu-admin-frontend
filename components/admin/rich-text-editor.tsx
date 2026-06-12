"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  ImageIcon,
  Quote,
  Code,
  Heading1,
  Heading2,
  Undo2,
  Redo2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}

type ActiveFormats = {
  bold: boolean
  italic: boolean
  insertUnorderedList: boolean
  insertOrderedList: boolean
  h1: boolean
  h2: boolean
  blockquote: boolean
  pre: boolean
}

// Un éditeur ne contenant que des blocs vides (ex. "<p><br></p>") doit afficher
// le placeholder et compter comme vide lors de la validation.
function isEditorEmpty(editor: HTMLElement) {
  const text = editor.textContent?.replace(/​/g, "").trim() ?? ""
  return text === "" && !editor.querySelector("img")
}

const emptyFormats: ActiveFormats = {
  bold: false,
  italic: false,
  insertUnorderedList: false,
  insertOrderedList: false,
  h1: false,
  h2: false,
  blockquote: false,
  pre: false,
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Commencez à écrire votre article...",
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const savedRange = useRef<Range | null>(null)
  const [formats, setFormats] = useState<ActiveFormats>(emptyFormats)
  const [isEmpty, setIsEmpty] = useState(true)
  const [linkUrl, setLinkUrl] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [isLinkOpen, setIsLinkOpen] = useState(false)
  const [isImageOpen, setIsImageOpen] = useState(false)

  // Initialise le contenu une seule fois pour éviter que le curseur ne saute
  // à chaque frappe (l'éditeur reste non-contrôlé après le montage).
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    // Force des paragraphes <p> comme blocs par défaut : indispensable pour que
    // les commandes de bloc (listes, citation, code) s'appliquent de façon fiable.
    try {
      document.execCommand("defaultParagraphSeparator", false, "p")
    } catch {
      /* non supporté : sans effet */
    }
    // Démarre toujours sur un vrai bloc, sinon execCommand échoue sur un nœud
    // texte nu directement sous le conteneur éditable.
    editor.innerHTML = value && value.trim() ? value : "<p><br></p>"
    setIsEmpty(isEditorEmpty(editor))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshFormats = useCallback(() => {
    if (typeof document === "undefined") return
    const block = (document.queryCommandValue("formatBlock") || "").toLowerCase()
    setFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
      h1: block === "h1",
      h2: block === "h2",
      blockquote: block === "blockquote",
      pre: block === "pre",
    })
  }, [])

  const emitChange = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    setIsEmpty(isEditorEmpty(editor))
    onChange(editor.innerHTML)
  }, [onChange])

  const saveSelection = useCallback(() => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        savedRange.current = range.cloneRange()
      }
    }
  }, [])

  const restoreSelection = useCallback(() => {
    const sel = window.getSelection()
    if (sel && savedRange.current) {
      sel.removeAllRanges()
      sel.addRange(savedRange.current)
    }
  }, [])

  const exec = useCallback(
    (command: string, arg?: string) => {
      editorRef.current?.focus()
      document.execCommand(command, false, arg)
      emitChange()
      refreshFormats()
    },
    [emitChange, refreshFormats]
  )

  // Bascule un bloc (titre, citation, code) : repasse en paragraphe si déjà actif.
  const toggleBlock = useCallback(
    (tag: "h1" | "h2" | "blockquote" | "pre", active: boolean) => {
      exec("formatBlock", active ? "p" : tag)
    },
    [exec]
  )

  const applyLink = useCallback(() => {
    const url = linkUrl.trim()
    if (!url) return
    restoreSelection()
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`
    const sel = window.getSelection()
    if (sel && sel.isCollapsed) {
      // Aucune sélection : insère l'URL comme texte cliquable.
      exec("insertHTML", `<a href="${href}">${href}</a>`)
    } else {
      exec("createLink", href)
    }
    setLinkUrl("")
    setIsLinkOpen(false)
  }, [linkUrl, restoreSelection, exec])

  const applyImage = useCallback(
    (src: string) => {
      const url = src.trim()
      if (!url) return
      restoreSelection()
      exec("insertImage", url)
      setImageUrl("")
      setIsImageOpen(false)
    },
    [restoreSelection, exec]
  )

  const handleImageFile = useCallback(
    (file: File | undefined) => {
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => applyImage(String(reader.result))
      reader.readAsDataURL(file)
    },
    [applyImage]
  )

  return (
    <div className={cn("rounded-xl bg-card card-shadow overflow-hidden", className)}>
      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
        <ToolbarButton
          label="Gras"
          icon={Bold}
          active={formats.bold}
          onClick={() => exec("bold")}
        />
        <ToolbarButton
          label="Italique"
          icon={Italic}
          active={formats.italic}
          onClick={() => exec("italic")}
        />

        <Divider />

        <ToolbarButton
          label="Titre 1"
          icon={Heading1}
          active={formats.h1}
          onClick={() => toggleBlock("h1", formats.h1)}
        />
        <ToolbarButton
          label="Titre 2"
          icon={Heading2}
          active={formats.h2}
          onClick={() => toggleBlock("h2", formats.h2)}
        />

        <Divider />

        <ToolbarButton
          label="Liste à puces"
          icon={List}
          active={formats.insertUnorderedList}
          onClick={() => exec("insertUnorderedList")}
        />
        <ToolbarButton
          label="Liste numérotée"
          icon={ListOrdered}
          active={formats.insertOrderedList}
          onClick={() => exec("insertOrderedList")}
        />
        <ToolbarButton
          label="Citation"
          icon={Quote}
          active={formats.blockquote}
          onClick={() => toggleBlock("blockquote", formats.blockquote)}
        />
        <ToolbarButton
          label="Bloc de code"
          icon={Code}
          active={formats.pre}
          onClick={() => toggleBlock("pre", formats.pre)}
        />

        <Divider />

        {/* Lien */}
        <Popover
          open={isLinkOpen}
          onOpenChange={(open) => {
            if (open) saveSelection()
            setIsLinkOpen(open)
          }}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Insérer un lien"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 space-y-3" align="start">
            <div className="space-y-2">
              <Label htmlFor="rte-link-url">URL du lien</Label>
              <Input
                id="rte-link-url"
                placeholder="https://exemple.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    applyLink()
                  }
                }}
              />
            </div>
            <Button size="sm" className="w-full" onClick={applyLink}>
              Insérer le lien
            </Button>
          </PopoverContent>
        </Popover>

        {/* Image */}
        <Popover
          open={isImageOpen}
          onOpenChange={(open) => {
            if (open) saveSelection()
            setIsImageOpen(open)
          }}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Insérer une image"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 space-y-3" align="start">
            <div className="space-y-2">
              <Label htmlFor="rte-image-url">URL de l{"'"}image</Label>
              <Input
                id="rte-image-url"
                placeholder="https://exemple.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    applyImage(imageUrl)
                  }
                }}
              />
            </div>
            <Button size="sm" className="w-full" onClick={() => applyImage(imageUrl)}>
              Insérer par URL
            </Button>
            <div className="relative">
              <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
              <span className="relative mx-auto block w-fit bg-popover px-2 text-xs text-muted-foreground">
                ou
              </span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rte-image-file">Depuis votre appareil</Label>
              <Input
                id="rte-image-file"
                type="file"
                accept="image/*"
                onChange={(e) => handleImageFile(e.target.files?.[0])}
              />
            </div>
          </PopoverContent>
        </Popover>

        <Divider />

        <ToolbarButton
          label="Annuler"
          icon={Undo2}
          onClick={() => exec("undo")}
        />
        <ToolbarButton
          label="Rétablir"
          icon={Redo2}
          onClick={() => exec("redo")}
        />
      </div>

      {/* Zone d'édition */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        data-empty={isEmpty}
        onInput={emitChange}
        onKeyUp={refreshFormats}
        onMouseUp={refreshFormats}
        onFocus={refreshFormats}
        className="rte-content relative min-h-[500px] p-6 text-base leading-relaxed focus:outline-none"
      />
    </div>
  )
}

function ToolbarButton({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  active?: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={label}
      aria-label={label}
      aria-pressed={active}
      // Empêche la perte de sélection au clic dans l'éditeur.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "h-8 w-8",
        active && "bg-primary/10 text-primary"
      )}
    >
      <Icon className="h-4 w-4" />
    </Button>
  )
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
}
