"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { Download, FileInput, Plus, Save, Trash2, Upload } from "lucide-react";
import { Field, FormSection, TextArea, TextInput } from "@/components/form-controls";
import {
  clearWorkroomStorage,
  createBackup,
  defaultSettings,
  getRequestStats,
  getSettings,
  restoreBackup,
  writeStorage,
  type AppSettings,
  type InstitutionTemplate,
  type RequestStats,
} from "@/lib/client-storage";
import { downloadJson } from "@/lib/export-document";

export function SettingsWorkspace() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [guidelineTitle, setGuidelineTitle] = useState("");
  const [guidelineContent, setGuidelineContent] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState<RequestStats>({ total: 0, byKind: {}, byDate: {}, lastRequestedAt: "" });
  useEffect(() => {
    const timer = window.setTimeout(() => { setSettings(getSettings()); setStats(getRequestStats()); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function save() {
    const saved = writeStorage("settings", settings);
    setMessage(saved ? "설정을 현재 브라우저에 저장했습니다." : "브라우저 저장 공간 오류로 설정을 저장하지 못했습니다.");
  }
  function addGuideline() {
    if (!guidelineTitle.trim() || !guidelineContent.trim()) { setMessage("지침 제목과 내용을 입력해 주세요."); return; }
    setSettings((current) => ({ ...current, guidelines: [...current.guidelines, { title: guidelineTitle.trim().slice(0, 120), content: guidelineContent.trim().slice(0, 4000) }].slice(-3) }));
    setGuidelineTitle(""); setGuidelineContent(""); setMessage("기관 지침 자료를 설정에 추가했습니다. 저장 버튼을 눌러 적용해 주세요.");
  }
  async function importGuideline(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    const content = (await file.text()).slice(0, 4000);
    setGuidelineTitle(file.name.replace(/\.[^.]+$/, "").slice(0, 120)); setGuidelineContent(content); setMessage("파일 내용을 불러왔습니다. 민감정보를 확인한 뒤 추가해 주세요."); event.target.value = "";
  }
  function addTemplate() {
    const name = templateName.trim(); if (!name) { setMessage("템플릿 이름을 입력해 주세요."); return; }
    const template: InstitutionTemplate = { id: crypto.randomUUID(), name, tone: settings.institutionTone, documentTitle: settings.customDocumentTitle, sectionHeadings: settings.customSections };
    setSettings((current) => ({ ...current, templates: [...current.templates, template], selectedTemplateId: template.id })); setTemplateName(""); setMessage("현재 문체와 문서 항목으로 템플릿을 만들었습니다.");
  }
  async function importTemplate(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const value = JSON.parse(await file.text()) as Partial<InstitutionTemplate>;
      if (!value.name || !Array.isArray(value.sectionHeadings)) throw new Error("템플릿 파일 형식을 확인해 주세요.");
      const template: InstitutionTemplate = { id: crypto.randomUUID(), name: String(value.name).slice(0, 120), tone: String(value.tone || "").slice(0, 300), documentTitle: String(value.documentTitle || "").slice(0, 120), sectionHeadings: value.sectionHeadings.map(String).slice(0, 8) };
      setSettings((current) => ({ ...current, templates: [...current.templates, template], selectedTemplateId: template.id })); setMessage("기관 양식 템플릿을 불러왔습니다.");
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "템플릿을 불러오지 못했습니다."); }
    event.target.value = "";
  }
  async function restore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    try { restoreBackup(await file.text()); setSettings(getSettings()); setStats(getRequestStats()); setMessage("백업을 복원했습니다."); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "백업을 복원하지 못했습니다."); }
    event.target.value = "";
  }

  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start"><div className="grid gap-5">
    <FormSection title="기관 문체와 사용자 지정 문서">
      <Field label="기관 문체" htmlFor="institution-tone"><TextArea id="institution-tone" value={settings.institutionTone} onChange={(event) => setSettings({ ...settings, institutionTone: event.target.value })} maxLength={300} /></Field>
      <Field label="기본 기관명 표시 방식" htmlFor="institution-name"><TextInput id="institution-name" value={settings.institutionNameDisplay} onChange={(event) => setSettings({ ...settings, institutionNameDisplay: event.target.value })} maxLength={120} /></Field>
      <Field label="사용자 지정 문서 제목" htmlFor="custom-title" hint="비우면 AI가 만든 기본 제목을 사용합니다."><TextInput id="custom-title" value={settings.customDocumentTitle} onChange={(event) => setSettings({ ...settings, customDocumentTitle: event.target.value })} maxLength={120} /></Field>
      <Field label="추가할 문서 항목" htmlFor="custom-sections" hint="쉼표나 줄바꿈으로 구분하며 최대 8개까지 반영합니다."><TextArea id="custom-sections" value={settings.customSections.join("\n")} onChange={(event) => setSettings({ ...settings, customSections: [...new Set(event.target.value.split(/[,\n]/).map((value) => value.trim()).filter(Boolean))].slice(0, 8) })} /></Field>
      <label className="flex cursor-pointer gap-3 rounded-xl border border-[var(--line)] bg-white p-4 text-sm"><input type="checkbox" checked={settings.autoSave} onChange={(event) => setSettings({ ...settings, autoSave: event.target.checked })} className="size-4 accent-[var(--sage)]" /> 초안을 브라우저에 자동 저장하도록 허용</label>
    </FormSection>
    <FormSection title="기관 양식 템플릿" description="계정이나 기관별 권한 없이, 이 브라우저에서만 문체·제목·추가 항목을 템플릿으로 관리합니다.">
      <Field label="사용할 템플릿" htmlFor="selected-template"><select id="selected-template" value={settings.selectedTemplateId} onChange={(event) => setSettings({ ...settings, selectedTemplateId: event.target.value })} className="mt-2 min-h-12 w-full rounded-xl border border-[#b8c8be] bg-white px-4">{settings.templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></Field>
      <div className="flex flex-wrap gap-2"><TextInput aria-label="새 템플릿 이름" value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="새 템플릿 이름" className="mt-0 flex-1" /><button type="button" onClick={addTemplate} className="action-button"><Plus size={17} aria-hidden="true" /> 현재 설정으로 추가</button></div>
      <div className="flex flex-wrap gap-2"><label className="action-button cursor-pointer"><Upload size={17} aria-hidden="true" /> 템플릿 JSON 불러오기<input type="file" accept="application/json,.json" onChange={importTemplate} className="sr-only" /></label>{settings.templates.find((template) => template.id === settings.selectedTemplateId) && <button type="button" onClick={() => downloadJson(settings.templates.find((template) => template.id === settings.selectedTemplateId), "기관양식_템플릿")} className="action-button"><Download size={17} aria-hidden="true" /> 선택 템플릿 내보내기</button>}{settings.selectedTemplateId !== "default" && <button type="button" onClick={() => setSettings({ ...settings, templates: settings.templates.filter((template) => template.id !== settings.selectedTemplateId), selectedTemplateId: "default" })} className="action-button text-[#a0382d]"><Trash2 size={17} aria-hidden="true" /> 삭제</button>}</div>
    </FormSection>
    <FormSection title="기관 지침 자료 연계" description="NotebookLM 등에서 정리한 기관 지침이나 직접 작성한 TXT·MD·JSON 자료를 최대 3개까지 연결합니다. 원문은 서버에 저장하지 않고 현재 브라우저에서만 관리하며, AI는 사용한 자료 제목을 결과에 표시합니다.">
      <Field label="자료 제목" htmlFor="guideline-title"><TextInput id="guideline-title" value={guidelineTitle} onChange={(event) => setGuidelineTitle(event.target.value)} maxLength={120} /></Field>
      <Field label="지침 내용" htmlFor="guideline-content" hint={`${guidelineContent.length.toLocaleString()} / 4,000자 · 개인정보와 유아 이름을 제거해 주세요.`}><TextArea id="guideline-content" value={guidelineContent} onChange={(event) => setGuidelineContent(event.target.value)} maxLength={4000} className="min-h-48" /></Field>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={addGuideline} className="action-button"><Plus size={17} aria-hidden="true" /> 지침 추가</button><label className="action-button cursor-pointer"><FileInput size={17} aria-hidden="true" /> TXT·MD·JSON 불러오기<input type="file" accept=".txt,.md,.json,text/plain,text/markdown,application/json" onChange={importGuideline} className="sr-only" /></label></div>
      <div className="grid gap-2">{settings.guidelines.map((source, index) => <div key={`${source.title}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-white p-3"><div><strong>{source.title}</strong><p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{source.content}</p></div><button type="button" onClick={() => setSettings({ ...settings, guidelines: settings.guidelines.filter((_, candidate) => candidate !== index) })} className="grid size-11 shrink-0 place-items-center rounded-lg text-[#a0382d]" aria-label={`${source.title} 삭제`}><Trash2 size={17} aria-hidden="true" /></button></div>)}</div>
    </FormSection>
    <button type="button" onClick={save} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[var(--sage-dark)] px-6 text-lg font-black text-white"><Save aria-hidden="true" /> 설정 저장</button>
  </div><aside className="grid gap-5 lg:sticky lg:top-5">
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5"><h2 className="font-black">브라우저 요청량 통계</h2><p className="mt-3 text-3xl font-black text-[var(--sage)]">{stats.total.toLocaleString()}회</p><div className="mt-4 grid gap-2 text-sm">{Object.entries(stats.byKind).map(([kind, count]) => <div key={kind} className="flex justify-between"><span>{kind}</span><strong>{count}회</strong></div>)}</div><p className="mt-4 text-xs leading-5 text-[var(--muted)]">원문이나 생성 결과 없이 요청 횟수만 이 브라우저에 저장합니다.</p></section>
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5"><h2 className="font-black">JSON 백업·복원</h2><p className="mt-2 text-sm leading-6 text-[var(--muted)]">설정과 이 브라우저에 저장한 입력·초안을 파일로 보관합니다. 사용자가 직접 적은 개인정보가 포함될 수 있으니 파일을 안전하게 관리해 주세요. API 키와 접근 코드는 포함되지 않습니다.</p><div className="mt-4 grid gap-2"><button type="button" onClick={() => { const backup = JSON.parse(createBackup()); downloadJson(backup, "도담비서_누리_백업"); }} className="action-button"><Download size={17} aria-hidden="true" /> 전체 백업</button><label className="action-button cursor-pointer"><Upload size={17} aria-hidden="true" /> 백업 복원<input type="file" accept="application/json,.json" onChange={restore} className="sr-only" /></label></div></section>
    <section className="rounded-2xl border border-[#e6b6aa] bg-[#fff1ed] p-5"><h2 className="font-black text-[#8b3026]">공용 컴퓨터 사용 후</h2><p className="mt-2 text-sm leading-6 text-[#744138]">저장자료를 삭제하면 이 브라우저의 설정·초안·템플릿·통계가 모두 제거되며 복구할 수 없습니다.</p><button type="button" onClick={() => { if (window.confirm("이 브라우저의 도담비서 저장자료를 모두 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) { clearWorkroomStorage(); setSettings(defaultSettings); setStats({ total: 0, byKind: {}, byDate: {}, lastRequestedAt: "" }); setMessage("브라우저 저장자료를 모두 삭제했습니다."); } }} className="action-button mt-4 border-[#d99b8d] text-[#a0382d]"><Trash2 size={17} aria-hidden="true" /> 저장자료 전체 삭제</button></section>
    <p className="rounded-xl bg-[var(--sage-soft)] p-4 text-sm leading-6 text-[var(--sage-dark)]"><strong>제외한 기능:</strong> 계정·기관별 권한과 암호화 서버 저장은 구현하지 않았습니다. 모든 초안과 기관 설정은 이 브라우저에만 남습니다.</p>
  </aside><p className="lg:col-span-2 text-sm font-semibold text-[var(--sage-dark)]" aria-live="polite">{message}</p></div>;
}
