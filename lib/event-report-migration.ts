import {
  eventReportResultSchema,
  legacyEventReportResultSchema,
  type EventReportResult,
} from "@/lib/schemas";

export function parseEventReportResult(value: unknown): EventReportResult | null {
  const current = eventReportResultSchema.safeParse(value);
  if (current.success) return current.data;

  const legacy = legacyEventReportResultSchema.safeParse(value);
  if (!legacy.success) return null;
  const old = legacy.data;
  return {
    documentTitle: old.documentTitle,
    overview: {
      eventName: old.overview.eventName,
      dateTime: old.overview.actualDateTime,
      place: old.overview.actualPlace,
      target: old.overview.target,
      participants: old.overview.actualParticipants,
      personInCharge: old.overview.personInCharge,
    },
    implementationSummary: old.implementationSummary,
    activities: [{ activity: "행사 운영", details: old.implementationSummary }],
    childResponses: old.childResponses,
    safetyAndIncidents: old.safetyAndIncidents,
    strengths: old.strengths,
    issuesAndImprovements: old.issuesAndImprovements,
    followUpActions: old.followUpActions,
    attachmentChecklist: old.attachmentChecklist,
    reviewFlags: old.reviewFlags,
    guidelineReferences: old.guidelineReferences,
  };
}
