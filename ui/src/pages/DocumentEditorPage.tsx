import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "@/lib/router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "../api/documents";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { MarkdownBody } from "../components/MarkdownBody";
import { PageSkeleton } from "../components/PageSkeleton";
import { Button } from "@/components/ui/button";
import { Save, Trash2, Eye, Pencil, X } from "lucide-react";

export function DocumentEditorPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const isNew = !documentId;
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const hasHydrated = useRef(false);

  const { data: doc, isLoading } = useQuery({
    queryKey: queryKeys.documents.detail(documentId!),
    queryFn: () => documentsApi.get(documentId!),
    enabled: !!documentId,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (doc && !hasHydrated.current) {
      hasHydrated.current = true;
      setTitle(doc.title);
      setContent(doc.content);
      setTagsInput(doc.tags.join(", "));
    }
  }, [doc]);

  useEffect(() => {
    setBreadcrumbs([
      { label: "Docs", href: "../documents" },
      { label: isNew ? "New Document" : title || "Untitled" },
    ]);
  }, [setBreadcrumbs, isNew, title]);

  const parsedTags = useMemo(
    () =>
      tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    [tagsInput],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const tags = parsedTags;
      if (isNew) {
        return documentsApi.create(selectedCompanyId!, { title, content, tags });
      }
      return documentsApi.update(documentId!, { title, content, tags });
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.list(selectedCompanyId!) });
      if (saved) {
        queryClient.invalidateQueries({ queryKey: queryKeys.documents.detail(saved.id) });
      }
      if (isNew && saved) {
        navigate(`../${saved.id}`, { replace: true });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => documentsApi.remove(documentId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.list(selectedCompanyId!) });
      navigate("../documents", { replace: true });
    },
  });

  if (!isNew && isLoading) {
    return <PageSkeleton variant="detail" />;
  }

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Title */}
      <input
        type="text"
        placeholder="Document title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-lg font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground"
      />

      {/* Tags */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Tags:</span>
        <input
          type="text"
          placeholder="e.g. strategy, decision, journal"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Tag preview chips */}
      {parsedTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {parsedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          onClick={() => setMode("edit")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
            mode === "edit"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          onClick={() => setMode("preview")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
            mode === "preview"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </button>
      </div>

      {/* Content area */}
      {mode === "edit" ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your document in Markdown..."
          className="w-full min-h-[400px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
        />
      ) : (
        <div className="min-h-[400px] rounded-md border border-input bg-background px-4 py-3">
          {content ? (
            <MarkdownBody>{content}</MarkdownBody>
          ) : (
            <p className="text-sm text-muted-foreground italic">Nothing to preview.</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={!title.trim() || saveMutation.isPending}
        >
          <Save className="h-3.5 w-3.5 mr-1.5" />
          {saveMutation.isPending ? "Saving..." : "Save"}
        </Button>

        {!isNew && !showDeleteConfirm && (
          <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete
          </Button>
        )}

        {showDeleteConfirm && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-destructive">Delete this document?</span>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Confirm"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {saveMutation.isError && (
          <p className="text-sm text-destructive">{saveMutation.error.message}</p>
        )}
      </div>
    </div>
  );
}
