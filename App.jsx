import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuid } from "uuid";

// ---- Storage helpers (localStorage only, export/import JSON) ----
const STORAGE_KEY = "rp-evidence-db-v1";

function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { investigations: [], evidence: [], version: 1 };
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load DB", e);
    return { investigations: [], evidence: [], version: 1 };
  }
}

function saveDB(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

// ---- Data types ----
// Investigation: { id, title, caseNumber, description, status, createdAt, updatedAt, tags: [] }
// Evidence: { id, investigationId, title, type, summary, createdAt, updatedAt, tags: [], entries: [] }
// Entry: { id, author, body, timestamp, attachments: [{label, url}] }

// ---- UI Primitives ----
const Button = ({ as: As = "button", className = "", ...props }) => (
  <As
    className={`px-3 py-2 rounded-2xl shadow-sm hover:shadow transition border border-black/5 bg-white hover:bg-black/5 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    {...props}
  />
);

const PrimaryButton = (props) => (
  <Button {...props} className={`bg-black text-white hover:bg-black/90 ${props.className || ""}`} />
);

const Input = ({ className = "", ...props }) => (
  <input
    className={`w-full rounded-2xl border border-black/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/20 ${className}`}
    {...props}
  />
);

const TextArea = ({ className = "", rows = 4, ...props }) => (
  <textarea
    rows={rows}
    className={`w-full rounded-2xl border border-black/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/20 ${className}`}
    {...props}
  />
);

const Tag = ({ children }) => (
  <span className="text-xs rounded-full border border-black/10 px-2 py-0.5 bg-black/5 mr-1">{children}</span>
);

const Card = ({ children, className = "" }) => (
  <div className={`rounded-2xl bg-white border border-black/10 shadow-sm p-4 ${className}`}>{children}</div>
);

// ---- Utility ----
function formatDate(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function csvSafe(s) {
  if (s == null) return "";
  const needsQuotes = /[",\n]/.test(String(s));
  let out = String(s).replaceAll('"', '""');
  return needsQuotes ? `"${out}"` : out;
}

// ---- Modals ----
function Modal({ open, onClose, title, children, wide = false }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/30" onClick={onClose} />
          <motion.div
            className={`relative z-10 w-full ${wide ? "max-w-4xl" : "max-w-2xl"}`}
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: 10 }}
          >
            <Card>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">{title}</h3>
                <Button onClick={onClose} aria-label="Close">✕</Button>
              </div>
              <div className="mt-4">{children}</div>
            </Card>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// ---- Forms ----
function InvestigationForm({ initial, onSubmit }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [caseNumber, setCaseNumber] = useState(initial?.caseNumber || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [status, setStatus] = useState(initial?.status || "Open");
  const [tags, setTags] = useState((initial?.tags || []).join(", "));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const payload = {
          title: title.trim(),
          caseNumber: caseNumber.trim(),
          description: description.trim(),
          status,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        };
        onSubmit(payload);
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="text-sm">Case #</label>
          <Input value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-sm">Status</label>
        <select
          className="w-full rounded-2xl border border-black/10 px-3 py-2"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option>Open</option>
          <option>Active</option>
          <option>On Hold</option>
          <option>Closed</option>
        </select>
      </div>
      <div>
        <label className="text-sm">Tags (comma separated)</label>
        <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="robbery, homicide, narcotics" />
      </div>
      <div>
        <label className="text-sm">Description</label>
        <TextArea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} />
      </div>
      <div className="flex items-center gap-2 justify-end">
        <PrimaryButton type="submit">Save</PrimaryButton>
      </div>
    </form>
  );
}

function EvidenceForm({ initial, onSubmit }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [type, setType] = useState(initial?.type || "Physical");
  const [summary, setSummary] = useState(initial?.summary || "");
  const [tags, setTags] = useState((initial?.tags || []).join(", "));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const payload = {
          title: title.trim(),
          type,
          summary: summary.trim(),
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        };
        onSubmit(payload);
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="text-sm">Type</label>
          <select className="w-full rounded-2xl border border-black/10 px-3 py-2" value={type} onChange={(e) => setType(e.target.value)}>
            <option>Physical</option>
            <option>Digital</option>
            <option>Witness Statement</option>
            <option>Forensics</option>
            <option>Media</option>
            <option>Other</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-sm">Tags (comma separated)</label>
        <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="CCTV, 9mm, DNA" />
      </div>
      <div>
        <label className="text-sm">Summary</label>
        <TextArea value={summary} onChange={(e) => setSummary(e.target.value)} rows={5} />
      </div>
      <div className="flex items-center gap-2 justify-end">
        <PrimaryButton type="submit">Save</PrimaryButton>
      </div>
    </form>
  );
}

function EntryForm({ onSubmit }) {
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState([{ label: "", url: "" }]);

  function addAttachment() {
    setAttachments((a) => [...a, { label: "", url: "" }]);
  }

  function updateAttachment(i, field, value) {
    setAttachments((prev) => prev.map((att, idx) => (idx === i ? { ...att, [field]: value } : att)));
  }

  function removeAttachment(i) {
    setAttachments((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const payload = {
          author: author.trim() || "Unknown",
          body: body.trim(),
          attachments: attachments
            .map((a) => ({ label: a.label.trim() || a.url.trim(), url: a.url.trim() }))
            .filter((a) => a.url),
        };
        onSubmit(payload);
        setAuthor("");
        setBody("");
        setAttachments([{ label: "", url: "" }]);
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-sm">Author</label>
          <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Deputy Name / Call Sign" />
        </div>
        <div>
          <label className="text-sm">Timestamp</label>
          <Input value={new Date().toLocaleString()} readOnly />
        </div>
      </div>
      <div>
        <label className="text-sm">Note</label>
        <TextArea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="What was found / chain of custody / where stored..." />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm">Attachments</label>
          <Button type="button" onClick={addAttachment}>+ Add</Button>
        </div>
        <div className="space-y-2 mt-2">
          {attachments.map((att, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2">
              <Input className="md:col-span-3" placeholder="Label (optional)" value={att.label} onChange={(e) => updateAttachment(i, "label", e.target.value)} />
              <Input className="md:col-span-8" placeholder="https://link-to-file-or-image" value={att.url} onChange={(e) => updateAttachment(i, "url", e.target.value)} />
              <Button type="button" className="md:col-span-1" onClick={() => removeAttachment(i)}>✕</Button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 justify-end">
        <PrimaryButton type="submit">Add Entry</PrimaryButton>
      </div>
    </form>
  );
}

// ---- Main App ----
export default function App() {
  const [db, setDb] = useState(loadDB());
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selected, setSelected] = useState(null); // investigation id
  const [showInvestigationModal, setShowInvestigationModal] = useState(false);
  const [editingInvestigation, setEditingInvestigation] = useState(null);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [editingEvidence, setEditingEvidence] = useState(null);
  const [activeEvidence, setActiveEvidence] = useState(null); // evidence id

  useEffect(() => saveDB(db), [db]);

  const investigations = db.investigations;
  const evidence = db.evidence;

  const selectedInvestigation = useMemo(() => investigations.find((i) => i.id === selected) || null, [investigations, selected]);
  const evidenceForSelected = useMemo(() => evidence.filter((e) => e.investigationId === selected).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)), [evidence, selected]);
  const activeEvidenceObj = useMemo(() => evidence.find((e) => e.id === activeEvidence) || null, [evidence, activeEvidence]);

  const filteredInvestigations = useMemo(() => {
    const q = query.toLowerCase();
    return investigations
      .filter((i) => (statusFilter === "All" ? true : i.status === statusFilter))
      .filter((i) =>
        !q
          ? true
          : [i.title, i.caseNumber, i.description, ...(i.tags || [])]
              .filter(Boolean)
              .some((f) => String(f).toLowerCase().includes(q))
      )
      .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
  }, [investigations, statusFilter, query]);

  function createInvestigation(data) {
    const now = Date.now();
    const inv = { id: uuid(), createdAt: now, updatedAt: now, ...data };
    setDb((prev) => ({ ...prev, investigations: [inv, ...prev.investigations] }));
    setShowInvestigationModal(false);
    setEditingInvestigation(null);
    setSelected(inv.id);
  }

  function updateInvestigation(id, data) {
    const now = Date.now();
    setDb((prev) => ({
      ...prev,
      investigations: prev.investigations.map((i) => (i.id === id ? { ...i, ...data, updatedAt: now } : i)),
    }));
    setShowInvestigationModal(false);
    setEditingInvestigation(null);
  }

  function deleteInvestigation(id) {
    if (!confirm("Delete investigation and all its evidence? This cannot be undone.")) return;
    setDb((prev) => ({
      ...prev,
      investigations: prev.investigations.filter((i) => i.id !== id),
      evidence: prev.evidence.filter((e) => e.investigationId !== id),
    }));
    if (selected === id) setSelected(null);
    if (activeEvidence && evidence.find((e) => e.investigationId === id)) setActiveEvidence(null);
  }

  function createEvidence(invId, data) {
    const now = Date.now();
    const ev = { id: uuid(), investigationId: invId, createdAt: now, updatedAt: now, entries: [], ...data };
    setDb((prev) => ({ ...prev, evidence: [ev, ...prev.evidence] }));
    setShowEvidenceModal(false);
    setEditingEvidence(null);
    setActiveEvidence(ev.id);
  }

  function updateEvidence(id, data) {
    const now = Date.now();
    setDb((prev) => ({
      ...prev,
      evidence: prev.evidence.map((e) => (e.id === id ? { ...e, ...data, updatedAt: now } : e)),
    }));
    setShowEvidenceModal(false);
    setEditingEvidence(null);
  }

  function deleteEvidence(id) {
    if (!confirm("Delete this evidence thread?")) return;
    setDb((prev) => ({ ...prev, evidence: prev.evidence.filter((e) => e.id !== id) }));
    if (activeEvidence === id) setActiveEvidence(null);
  }

  function addEntry(evidenceId, data) {
    const now = Date.now();
    const entry = { id: uuid(), timestamp: now, ...data };
    setDb((prev) => ({
      ...prev,
      evidence: prev.evidence.map((e) =>
        e.id === evidenceId ? { ...e, entries: [entry, ...(e.entries || [])], updatedAt: now } : e
      ),
    }));
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evidence-export-${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCSV() {
    // Flatten into rows: investigation, evidence, entry
    const rows = [
      [
        "caseNumber",
        "investigationTitle",
        "investigationStatus",
        "investigationTags",
        "evidenceTitle",
        "evidenceType",
        "evidenceTags",
        "entryTimestamp",
        "entryAuthor",
        "entryBody",
        "attachments",
      ],
    ];

    db.evidence.forEach((ev) => {
      const inv = db.investigations.find((i) => i.id === ev.investigationId);
      (ev.entries || []).forEach((en) => {
        rows.push([
          inv?.caseNumber || "",
          inv?.title || "",
          inv?.status || "",
          (inv?.tags || []).join(";"),
          ev.title || "",
          ev.type || "",
          (ev.tags || []).join(";"),
          new Date(en.timestamp).toISOString(),
          en.author || "",
          en.body || "",
          (en.attachments || []).map((a) => `${a.label || "link"}:${a.url}`).join(" | "),
        ]);
      });
    });

    const csv = rows.map((r) => r.map(csvSafe).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evidence-export-${new Date().toISOString().slice(0, 19)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!imported || typeof imported !== "object") throw new Error("Invalid file");
        if (!Array.isArray(imported.investigations) || !Array.isArray(imported.evidence)) throw new Error("Missing keys");
        setDb(imported);
        alert("Import successful. Data replaced.");
      } catch (e) {
        alert("Import failed: " + e.message);
      }
    };
    reader.readAsText(file);
  }

  const fileInputRef = useRef(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-black/5">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="text-2xl font-bold tracking-tight">Evidence Log</div>
          <div className="ml-auto flex items-center gap-2">
            <Button onClick={() => fileInputRef.current?.click()}>Import JSON</Button>
            <input
              type="file"
              accept="application/json"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => e.target.files && e.target.files[0] && importJSON(e.target.files[0])}
            />
            <Button onClick={exportCSV}>Export CSV</Button>
            <PrimaryButton onClick={exportJSON}>Export JSON</PrimaryButton>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-4">
          <Card>
            <div className="flex items-center gap-2">
              <Input placeholder="Search title, tags, notes…" value={query} onChange={(e) => setQuery(e.target.value)} />
              <Button onClick={() => setQuery("")}>Clear</Button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <select className="rounded-2xl border border-black/10 px-3 py-2" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option>All</option>
                <option>Open</option>
                <option>Active</option>
                <option>On Hold</option>
                <option>Closed</option>
              </select>
              <PrimaryButton onClick={() => { setEditingInvestigation(null); setShowInvestigationModal(true); }}>+ New Investigation</PrimaryButton>
            </div>
          </Card>

          <Card className="max-h-[70vh] overflow-auto">
            <h3 className="font-semibold mb-2">Investigations ({filteredInvestigations.length})</h3>
            <div className="space-y-2">
              {filteredInvestigations.map((i) => (
                <div key={i.id} className={`rounded-xl border p-3 cursor-pointer ${selected === i.id ? "border-black" : "border-black/10"}`} onClick={() => { setSelected(i.id); setActiveEvidence(null); }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold truncate">{i.title} {i.caseNumber ? <span className="text-xs text-black/60">(#{i.caseNumber})</span> : null}</div>
                    <span className="text-xs px-2 py-0.5 rounded-full border border-black/10 bg-black/5">{i.status}</span>
                  </div>
                  <div className="mt-1 text-sm line-clamp-2 text-black/70">{i.description}</div>
                  <div className="mt-2 flex flex-wrap gap-1">{(i.tags || []).map((t) => <Tag key={t}>{t}</Tag>)}</div>
                  <div className="mt-2 text-xs text-black/60">Updated {formatDate(i.updatedAt || i.createdAt)}</div>
                </div>
              ))}
              {!filteredInvestigations.length && <div className="text-sm text-black/60">No investigations yet.</div>}
            </div>
          </Card>
        </aside>

        {/* Main content */}
        <section className="lg:col-span-8 space-y-4">
          {!selectedInvestigation ? (
            <Card className="h-[60vh] flex items-center justify-center text-black/60">Select an investigation to view details.</Card>
          ) : (
            <>
              <Card>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-semibold">{selectedInvestigation.title}</h2>
                      {selectedInvestigation.caseNumber && (
                        <span className="text-sm text-black/60">#{selectedInvestigation.caseNumber}</span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">{(selectedInvestigation.tags || []).map((t) => <Tag key={t}>{t}</Tag>)}</div>
                    <p className="mt-2 text-black/80 whitespace-pre-wrap">{selectedInvestigation.description}</p>
                    <div className="mt-2 text-xs text-black/60">Created {formatDate(selectedInvestigation.createdAt)} • Updated {formatDate(selectedInvestigation.updatedAt || selectedInvestigation.createdAt)}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button onClick={() => { setEditingInvestigation(selectedInvestigation); setShowInvestigationModal(true); }}>Edit</Button>
                    <Button onClick={() => deleteInvestigation(selectedInvestigation.id)}>Delete</Button>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Evidence Threads ({evidenceForSelected.length})</h3>
                  <PrimaryButton onClick={() => { setEditingEvidence(null); setShowEvidenceModal(true); }}>+ New Evidence</PrimaryButton>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {evidenceForSelected.map((ev) => (
                    <div key={ev.id} className={`rounded-xl border p-3 cursor-pointer ${activeEvidence === ev.id ? "border-black" : "border-black/10"}`} onClick={() => setActiveEvidence(ev.id)}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold truncate">{ev.title}</div>
                        <span className="text-xs px-2 py-0.5 rounded-full border border-black/10 bg-black/5">{ev.type}</span>
                      </div>
                      <div className="mt-1 text-sm line-clamp-2 text-black/70">{ev.summary}</div>
                      <div className="mt-2 flex flex-wrap gap-1">{(ev.tags || []).map((t) => <Tag key={t}>{t}</Tag>)}</div>
                      <div className="mt-2 text-xs text-black/60">Updated {formatDate(ev.updatedAt || ev.createdAt)}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <Button onClick={(e) => { e.stopPropagation(); setEditingEvidence(ev); setShowEvidenceModal(true); }}>Edit</Button>
                        <Button onClick={(e) => { e.stopPropagation(); deleteEvidence(ev.id); }}>Delete</Button>
                      </div>
                    </div>
                  ))}
                  {!evidenceForSelected.length && <div className="text-sm text-black/60">No evidence yet. Create the first thread.</div>}
                </div>
              </Card>

              {activeEvidenceObj && (
                <Card>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold">{activeEvidenceObj.title}</h3>
                      <div className="text-sm text-black/60">{activeEvidenceObj.type} • {formatDate(activeEvidenceObj.createdAt)}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => { setEditingEvidence(activeEvidenceObj); setShowEvidenceModal(true); }}>Edit</Button>
                      <Button onClick={() => deleteEvidence(activeEvidenceObj.id)}>Delete</Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                    <div>
                      <h4 className="font-semibold mb-2">New Entry</h4>
                      <EntryForm onSubmit={(payload) => addEntry(activeEvidenceObj.id, payload)} />
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Thread ({activeEvidenceObj.entries?.length || 0})</h4>
                      <div className="space-y-3 max-h-[50vh] overflow-auto pr-1">
                        {(activeEvidenceObj.entries || []).map((en) => (
                          <div key={en.id} className="rounded-xl border border-black/10 p-3">
                            <div className="flex items-center justify-between text-sm">
                              <div className="font-semibold">{en.author}</div>
                              <div className="text-black/60">{formatDate(en.timestamp)}</div>
                            </div>
                            <p className="mt-1 whitespace-pre-wrap">{en.body}</p>
                            {!!(en.attachments || []).length && (
                              <div className="mt-2">
                                <div className="text-sm font-medium">Attachments</div>
                                <ul className="list-disc ml-6 text-sm">
                                  {en.attachments.map((a, idx) => (
                                    <li key={idx}><a className="underline break-all" href={a.url} target="_blank" rel="noreferrer">{a.label || a.url}</a></li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                        {!(activeEvidenceObj.entries || []).length && <div className="text-sm text-black/60">No entries yet.</div>}
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}
        </section>
      </main>

      {/* Investigation modal */}
      <Modal
        open={showInvestigationModal}
        onClose={() => { setShowInvestigationModal(false); setEditingInvestigation(null); }}
        title={editingInvestigation ? "Edit Investigation" : "New Investigation"}
        wide
      >
        <InvestigationForm
          initial={editingInvestigation || undefined}
          onSubmit={(payload) =>
            editingInvestigation ? updateInvestigation(editingInvestigation.id, payload) : createInvestigation(payload)
          }
        />
      </Modal>

      {/* Evidence modal */}
      <Modal
        open={showEvidenceModal}
        onClose={() => { setShowEvidenceModal(false); setEditingEvidence(null); }}
        title={editingEvidence ? "Edit Evidence" : "New Evidence"}
      >
        <EvidenceForm
          initial={editingEvidence || undefined}
          onSubmit={(payload) => (editingEvidence ? updateEvidence(editingEvidence.id, payload) : createEvidence(selected, payload))}
        />
      </Modal>

      <footer className="max-w-7xl mx-auto px-4 pb-10 text-center text-xs text-black/60">
        <div className="mt-6">Stored locally in your browser. Use Export/Import to back up or move between devices.</div>
      </footer>
    </div>
  );
}
