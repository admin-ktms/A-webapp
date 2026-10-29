
import { supabase } from "../lib/supabase";

export const AUDIT_PAGE_SIZE = 50;

export type AuditFilters = {
  search: string;
  eventReason: string;
  actionSource: string;
  actionStatus: string;
  relatedEntity: string;
  relatedRecordId: string;
  tournamentId: string;
  from: string;
  to: string;
};

export type AuditRecord = {
  audit_log_id: string;
  tournament_id: string | null;
  correlation_id: string | null;
  action_time: string;
  action_datetime: string;
  action_source: string;
  action_status: string;
  action_summary: string;
  related_entity: string | null;
  related_record_id: string | null;
  previous_value: unknown;
  new_value: unknown;
  reason: string | null;
  performed_by_type: string;
  performed_by_id: string | null;
  event_category: string | null;
};

export type AuditPage = {
  records: AuditRecord[];
  hasNextPage: boolean;
};

export type ReadAuditOptions = {
  filters: AuditFilters;
  offset: number;
  authorizationReason: string;
};

function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toIsoOrNull(value: string): string | null {
  if (!value.trim()) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date/time filter: ${value}`);
  }

  return date.toISOString();
}

export async function readAuditPage({
  filters,
  offset,
  authorizationReason,
}: ReadAuditOptions): Promise<AuditPage> {
  const reason = authorizationReason.trim();

  if (!reason) {
    throw new Error("Enter a justification for accessing audit records.");
  }

  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error("Audit pagination offset must be non-negative.");
  }

  const from = toIsoOrNull(filters.from);
  const to = toIsoOrNull(filters.to);

  if (from && to && new Date(from).getTime() > new Date(to).getTime()) {
    throw new Error("The start date/time must not be after the end date/time.");
  }

  const { data, error } = await supabase
    .schema("audit")
    .rpc("read_audit_log", {
      p_reason: reason,
      p_category: null,
      p_action_source: optionalText(filters.actionSource),
      p_related_entity: optionalText(filters.relatedEntity),
      p_related_record_id: optionalText(filters.relatedRecordId),
      p_tournament_id: optionalText(filters.tournamentId),
      p_from: from,
      p_to: to,
      p_limit: AUDIT_PAGE_SIZE,
      p_offset: offset,
      p_search: optionalText(filters.search),
      p_event_reason: optionalText(filters.eventReason),
      p_action_status: optionalText(filters.actionStatus),
    });

  if (error) {
    throw new Error(error.message || "Unable to read audit records.");
  }

  const records = (data ?? []) as AuditRecord[];

  return {
    records,
    hasNextPage: records.length === AUDIT_PAGE_SIZE,
  };
}
