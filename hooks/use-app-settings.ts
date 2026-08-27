"use client";

import { useEffect, useState } from "react";
import { defaultSettings, getSelectedTemplate, getSettings, type AppSettings } from "@/lib/client-storage";
import type { StyleContext } from "@/lib/schemas";

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettings(getSettings()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  return settings;
}

export function settingsToStyleContext(settings: AppSettings): StyleContext {
  const template = getSelectedTemplate(settings);
  const tone = template?.id === "default" ? settings.institutionTone : template?.tone || settings.institutionTone;
  const institution = settings.institutionNameDisplay.trim();
  return {
    institutionTone: institution && institution !== defaultSettings.institutionNameDisplay ? `${tone}\n문서 기관 표기: ${institution}` : tone,
    customTitle: settings.customDocumentTitle || template?.documentTitle || "",
    customSections: [...new Set([...settings.customSections, ...(template?.sectionHeadings || [])])].slice(0, 8),
    templateName: template?.name || "기본 템플릿",
    guidelineSources: settings.guidelines.slice(0, 3),
  };
}
