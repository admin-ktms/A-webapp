
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileImage,
  FileText,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import ImageViewer from "../components/media/ImageViewer";
import ImageThumbnail from "../components/media/ImageThumbnail";
import type { ImageViewerImage } from "../components/media/imageViewer.types";
import {
  decideBankTransferPayment,
  disqualifyTournamentPlayer,
  getRegistrationDetails,
  getRegistrationDirectory,
  getRegistrationPaymentProof,
  getRegistrationSquadScreenshots,
  type RegistrationDetailsResponse,
  type RegistrationDirectoryItem,
  type RegistrationDirectoryResponse,
} from "../features/registrationService";

const PAGE_SIZE = 50;

const TOURNAMENT_SECTIONS = [
  { label: "Tournament overview", path: "/" },
  { label: "Registrations", path: "/registrations" },
  { label: "Matchdays", path: "/matchdays" },
  { label: "Groups", path: "/groups" },
  { label: "Fixtures", path: "/fixtures" },
  { label: "Results", path: "/results" },
  { label: "Standings", path: "/standings" },
  { label: "Disputes", path: "/disputes" },
  { label: "Awards", path: "/awards" },
];

type ViewerState = {
  images: ImageViewerImage[];
  initialIndex: number;
} | null;

function valueOf(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function dateOf(value: unknown): string {
  if (typeof value !== "string" || !value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function amountOf(amount: unknown, currency: unknown): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const number = Number(amount);
  const formatted = Number.isFinite(number)
    ? number.toLocaleString()
    : String(amount);
  return [typeof currency === "string" ? currency : "", formatted]
    .filter(Boolean)
    .join(" ");
}

function statusStyle(value: unknown): string {
  const status = String(value ?? "").toLowerCase();

  if (
    status.includes("reject") ||
    status.includes("fail") ||
    status.includes("refund") ||
    status.includes("disqual")
  ) {
    return "border-coral/30 bg-coral/10 text-coral";
  }

  if (
    status.includes("approved") ||
    status.includes("success") ||
    status.includes("registered") ||
    status.includes("active") ||
    status.includes("complete")
  ) {
    return "border-green/30 bg-green/10 text-green";
  }

  if (
    status.includes("awaiting") ||
    status.includes("pending") ||
    status.includes("processing")
  ) {
    return "border-gold/30 bg-gold/10 text-gold";
  }

  return "border-border bg-surface text-muted";
}

function StatusPill({ value }: { value: unknown }) {
  return (
    <span className={`inline-flex max-w-full rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyle(value)}`}>
      {valueOf(value)}
    </span>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  accent = "text-cyan",
}: {
  label: string;
  value: number;
  icon: typeof Users;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted">{label}</span>
        <Icon size={17} className={accent} />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium">
        {valueOf(value)}
      </dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-panel">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
      {children}
    </div>
  );
}

function RegistrationDetail({
  tournamentId,
  item,
  onClose,
  onChanged,
}: {
  tournamentId: string;
  item: RegistrationDirectoryItem;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [details, setDetails] = useState<RegistrationDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [squadImages, setSquadImages] = useState<ImageViewerImage[]>([]);
  const [viewer, setViewer] = useState<ViewerState>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [proofMime, setProofMime] = useState("");
  const [proofLoading, setProofLoading] = useState(false);
  const [proofError, setProofError] = useState("");
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  const [decisionMessage, setDecisionMessage] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  const [disqualificationReason, setDisqualificationReason] = useState("");
  const [disqualificationBusy, setDisqualificationBusy] = useState(false);
  const [disqualificationError, setDisqualificationError] = useState("");
  const [showDisqualification, setShowDisqualification] = useState(false);

  const loadDetails = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getRegistrationDetails(
        tournamentId,
        item.registration_reference_id,
      );

      setDetails(result);

      try {
        const screenshots = await getRegistrationSquadScreenshots(
          tournamentId,
          item.registration_reference_id,
        );

        setSquadImages(
          screenshots.map((screenshot, index) => ({
            src: screenshot.signedUrl,
            alt: `Squad screenshot ${index + 1}`,
            label: `Squad screenshot ${index + 1}`,
          })),
        );
      } catch {
        setSquadImages([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load registration.");
    } finally {
      setLoading(false);
    }
  }, [tournamentId, item.registration_reference_id]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const request = details?.registration.request ?? {};
  const registration = details?.registration.official_registration ?? null;
  const player = details?.player ?? {};
  const navigate = useNavigate();
  const squad = details?.squad.details ?? {};
  const payment = details?.payment;
  const currentTransaction = payment?.current_transaction ?? null;
  const transactions = payment?.transaction_history ?? [];
  const participation = details?.participation;

  async function openPaymentProof(transactionId: string) {
    setProofLoading(true);
    setProofError("");
    setProofUrl("");
    setProofMime("");

    try {
      const result = await getRegistrationPaymentProof(
        tournamentId,
        item.registration_reference_id,
        transactionId,
      );

      if (!result.proof) {
        setProofError("No payment proof was submitted for this transaction.");
        return;
      }

      setProofUrl(result.proof.signed_url);
      setProofMime(result.proof.mime_type);
    } catch (err) {
      setProofError(err instanceof Error ? err.message : "Unable to load payment proof.");
    } finally {
      setProofLoading(false);
    }
  }

  async function submitDisqualification() {
    const registrationId = registration?.registration_id;
    const playerId = player.player_id ?? item.player_id;
  
    if (!registrationId) {
      setDisqualificationError(
        "This player does not have an official registration to disqualify.",
      );
      return;
    }
  
    if (!disqualificationReason.trim()) {
      setDisqualificationError("Enter a reason for disqualification.");
      return;
    }
  
    const confirmed = window.confirm(
      `Disqualify ${valueOf(
        player.manager_name,
        item.player_name || item.manager_name || "Unknown player",
      )} from ${valueOf(
        details.tournament.tournament_name,
        "this tournament",
      )}?\n\nReason: ${disqualificationReason.trim()}\n\nThis action may resolve affected fixtures and update tournament standings.`,
    );

  
    if (!confirmed) return;
  
    setDisqualificationBusy(true);
    setDisqualificationError("");
  
    try {
      await disqualifyTournamentPlayer(
        tournamentId,
        String(registrationId),
        disqualificationReason,
      );
  
      setDisqualificationReason("");
      setShowDisqualification(false);
  
      await loadDetails();
      await onChanged();
    } catch (err) {
      setDisqualificationError(
        err instanceof Error
          ? err.message
          : "Unable to disqualify this player.",
      );
    } finally {
      setDisqualificationBusy(false);
    }
  }
  
  async function submitDecision(decision: "approve" | "reject") {
    setDecisionBusy(true);
    setDecisionError("");
    setDecisionMessage("");

    try {
      const result = await decideBankTransferPayment(
        item.registration_reference_id,
        decision,
        decision === "reject" ? rejectionReason : undefined,
      );

      if (!result.success) {
        setDecisionError(result.reason_code || "The decision was not completed.");
        return;
      }

      setDecisionMessage(result.reason_code);
      setShowReject(false);
      setRejectionReason("");

      await loadDetails();
      await onChanged();
    } catch (err) {
      setDecisionError(err instanceof Error ? err.message : "Payment decision failed.");
    } finally {
      setDecisionBusy(false);
    }
  }

  const currentTransactionId =
    typeof currentTransaction?.transaction_history_id === "string"
      ? currentTransaction.transaction_history_id
      : null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="rounded-xl border border-border bg-panel p-6 text-sm text-muted">
          Loading registration details…
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-lg rounded-xl border border-border bg-panel p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold">Registration details</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-muted hover:bg-surface"
              aria-label="Close"
            >
              <X size={19} />
            </button>
          </div>
          <p role="alert" className="mt-4 text-sm text-coral">
            {error || "Registration details are unavailable."}
          </p>
          <button
            onClick={() => void loadDetails()}
            className="mt-5 min-h-11 rounded-lg border border-border px-4 text-sm"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const playerName =
    valueOf(player.manager_name, item.player_name || item.manager_name || "Unknown player");

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-0 sm:p-4">
      <div className="mx-auto min-h-screen w-full max-w-6xl bg-background text-text sm:my-4 sm:min-h-0 sm:rounded-2xl sm:border sm:border-border">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-panel/95 px-4 py-3 backdrop-blur sm:rounded-t-2xl sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-cyan">
              Registration detail
            </p>
            <h2 className="truncate text-lg font-semibold">{playerName}</h2>
            <p className="truncate text-xs text-muted">
              {item.registration_reference_id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close registration details"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border text-muted hover:border-cyan hover:text-cyan"
          >
            <X size={19} />
          </button>
        </header>

        <div className="space-y-5 p-4 sm:p-6">
          {decisionMessage && (
            <div role="status" className="rounded-lg border border-green/30 bg-green/10 p-3 text-sm text-green">
              {decisionMessage}
            </div>
          )}
          {decisionError && (
            <div role="alert" className="rounded-lg border border-coral/30 bg-coral/10 p-3 text-sm text-coral">
              {decisionError}
            </div>
          )}

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-panel p-3">
              <p className="text-xs text-muted">Request status</p>
              <div className="mt-2"><StatusPill value={request.request_status} /></div>
            </div>
            <div className="rounded-xl border border-border bg-panel p-3">
              <p className="text-xs text-muted">Payment status</p>
              <div className="mt-2"><StatusPill value={currentTransaction?.payment_status} /></div>
            </div>
            <div className="rounded-xl border border-border bg-panel p-3">
              <p className="text-xs text-muted">Registration</p>
              <div className="mt-2"><StatusPill value={registration?.registration_status ?? "Not registered"} /></div>
            </div>
            <div className="rounded-xl border border-border bg-panel p-3">
              <p className="text-xs text-muted">Tournament stage</p>
              <p className="mt-2 text-sm font-semibold">{valueOf(registration?.current_stage, "Not started")}</p>
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <Section title="Player profile">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                <DetailField label="Player name" value={player.manager_name ?? item.manager_name} />
                <DetailField label="Player ID" value={player.player_id ?? item.player_id} />
                <DetailField label="Email" value={player.email_address ?? item.player_email ?? item.request_email} />
                <DetailField label="WhatsApp" value={player.whatsapp_number} />
                <DetailField label="Player status" value={player.player_status ?? item.player_status} />
                <DetailField label="Age" value={request.age} />
              </dl>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    const playerId = player.player_id ?? item.player_id;
              
                    if (!playerId) return;
              
                    navigate(
                      `/players?tab=operations&playerId=${encodeURIComponent(
                        String(playerId),
                      )}`,
                    );
                  }}
                  disabled={!player.player_id && !item.player_id}
                  className="min-h-10 rounded-lg border border-border px-4 text-sm font-semibold hover:border-cyan hover:text-cyan disabled:opacity-50"
                >
                  Operations
                </button>
                <p className="mt-2 text-xs text-muted">
                  Use Player Operations for restrictions across a tournament type.
                </p>
              </div>
            </Section>

            <Section title="Tournament registration">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                <DetailField label="Registration reference" value={request.registration_reference_id} />
                <DetailField label="Official registration ID" value={registration?.registration_id} />
                <DetailField label="Request submitted" value={dateOf(request.request_datetime)} />
                <DetailField label="Registered at" value={dateOf(registration?.registration_datetime)} />
                <DetailField label="Registration fee" value={amountOf(request.registration_fee, details.tournament.currency)} />
                <DetailField label="Payment verified" value={dateOf(request.payment_verified_datetime)} />
                <DetailField label="Payment deadline" value={dateOf(request.payment_deadline_datetime)} />
                <DetailField label="Rejection reason" value={request.rejection_reason} />
              </dl>
            </Section>
          </div>

          <Section title="Registered squad">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
              <DetailField label="Squad name" value={squad.squad_name ?? request.squad_name} />
              <DetailField label="Squad ID" value={squad.squad_id ?? request.squad_id} />
              <DetailField label="Squad slot" value={squad.squad_slot} />
            </dl>

            <div className="mt-4">
              <p className="mb-2 text-xs text-muted">Squad screenshots</p>
              {squadImages.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {squadImages.map((image, index) => (
                    <ImageThumbnail
                      key={image.src}
                      image={image}
                      onClick={() => setViewer({ images: squadImages, initialIndex: index })}
                      className="aspect-[4/3] w-full"
                    />
                  ))}
                </div>
              ) : (
                <EmptyState>No squad screenshots available.</EmptyState>
              )}
            </div>
          </Section>

          <Section title="Payment and verification">
            {currentTransaction ? (
              <>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
                  <DetailField label="Transaction ID" value={currentTransaction.transaction_history_id} />
                  <DetailField label="Provider" value={currentTransaction.payment_provider} />
                  <DetailField label="Payment status" value={currentTransaction.payment_status} />
                  <DetailField label="Amount" value={amountOf(currentTransaction.amount, currentTransaction.currency)} />
                  <DetailField label="Payment reference" value={currentTransaction.payment_reference} />
                  <DetailField label="Submitted" value={dateOf(currentTransaction.created_datetime)} />
                  <DetailField label="Paid at" value={dateOf(currentTransaction.payment_datetime)} />
                  <DetailField label="Verified at" value={dateOf(currentTransaction.verified_datetime)} />
                  <DetailField label="Rejection reason" value={currentTransaction.rejection_reason} />
                </dl>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {currentTransactionId && (
                    <button
                      type="button"
                      onClick={() => void openPaymentProof(currentTransactionId)}
                      disabled={proofLoading}
                      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium hover:border-cyan disabled:opacity-50"
                    >
                      {proofLoading ? <RefreshCw size={16} className="animate-spin" /> : <FileImage size={16} />}
                      View payment proof
                    </button>
                  )}

                  {proofUrl && (
                    <a
                      href={proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm hover:border-cyan"
                    >
                      <ExternalLink size={15} /> Open proof in new tab
                    </a>
                  )}
                </div>

                {proofError && (
                  <p role="status" className="mt-3 text-sm text-muted">{proofError}</p>
                )}

                {proofUrl && (
                  <div className="mt-4 overflow-hidden rounded-lg border border-border bg-background p-2">
                    {proofMime === "application/pdf" ? (
                      <div className="flex items-center gap-3 p-3 text-sm">
                        <FileText className="text-cyan" />
                        <span>PDF payment proof</span>
                        <a href={proofUrl} target="_blank" rel="noreferrer" className="ml-auto text-cyan underline">
                          Open PDF
                        </a>
                      </div>
                    ) : (
                      <img
                        src={proofUrl}
                        alt="Bank-transfer payment proof"
                        className="mx-auto max-h-[520px] w-auto max-w-full object-contain"
                      />
                    )}
                  </div>
                )}

                {payment?.verification_available && (
                  <div className="mt-5 rounded-xl border border-gold/30 bg-gold/5 p-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck size={20} className="mt-0.5 shrink-0 text-gold" />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold">Bank transfer awaiting verification</h4>
                        <p className="mt-1 text-sm text-muted">
                          Approval confirms payment and may create the official tournament registration. Rejection requires a reason and returns the request to Pending Payment.
                        </p>

                        {!showReject ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void submitDecision("approve")}
                              disabled={decisionBusy}
                              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-green px-4 text-sm font-semibold text-background disabled:opacity-50"
                            >
                              <CheckCircle2 size={16} />
                              {decisionBusy ? "Processing…" : "Verify bank transfer"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowReject(true)}
                              disabled={decisionBusy}
                              className="min-h-11 rounded-lg border border-coral/40 px-4 text-sm font-semibold text-coral disabled:opacity-50"
                            >
                              Reject proof
                            </button>
                          </div>
                        ) : (
                          <div className="mt-4 space-y-3">
                            <label
                              className="block text-xs font-medium text-muted"
                              htmlFor="registration-rejection-reason"
                            >
                              Rejection reason (required)
                            </label>
                            <textarea
                              id="registration-rejection-reason"
                              value={rejectionReason}
                              onChange={(event) => setRejectionReason(event.target.value)}
                              rows={3}
                              maxLength={1000}
                              className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-cyan"
                              placeholder="Explain why this payment proof is being rejected."
                            />
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void submitDecision("reject")}
                                disabled={decisionBusy || !rejectionReason.trim()}
                                className="min-h-11 rounded-lg bg-coral px-4 text-sm font-semibold text-background disabled:opacity-50"
                              >
                                {decisionBusy ? "Processing…" : "Confirm rejection"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowReject(false);
                                  setRejectionReason("");
                                }}
                                className="min-h-11 rounded-lg border border-border px-4 text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <EmptyState>No current payment transaction is linked to this request.</EmptyState>
            )}

            <div className="mt-5">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
                Transaction history
              </h4>
              {transactions.length ? (
                <div className="space-y-2">
                  {transactions.map((transaction, index) => (
                    <div
                      key={String(transaction.transaction_history_id ?? index)}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                    >
                      <div className="min-w-0">
                        <p className="break-all text-xs font-medium">
                          {valueOf(transaction.transaction_history_id)}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {valueOf(transaction.payment_provider)} · {dateOf(transaction.created_datetime)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusPill value={transaction.payment_status} />
                        {typeof transaction.transaction_history_id === "string" && (
                          <button
                            type="button"
                            onClick={() => void openPaymentProof(transaction.transaction_history_id as string)}
                            className="text-xs font-medium text-cyan hover:underline"
                          >
                            Proof
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState>No transaction history.</EmptyState>
              )}
            </div>
          </Section>

          <Section title="Tournament participation">
            {registration ? (
              <>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
                  <DetailField label="Current stage" value={registration.current_stage} />
                  <DetailField label="Registration status" value={registration.registration_status} />
                  <DetailField label="Group" value={participation?.group?.group_name} />
                  <DetailField label="Group position" value={registration.group_position} />
                  <DetailField label="Fixtures" value={participation?.summary.fixtures_total} />
                  <DetailField label="Official results" value={participation?.summary.official_results} />
                  <DetailField label="Matches played" value={participation?.summary.matches_played} />
                  <DetailField label="Final rank" value={registration.final_rank} />
                </dl>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                      Fixtures
                    </h4>
                    {participation?.fixtures.length ? (
                      <div className="space-y-2">
                        {participation.fixtures.map((fixture, index) => (
                          <div key={String(fixture.fixture_id ?? index)} className="rounded-lg border border-border p-3 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">{valueOf(fixture.match_code, valueOf(fixture.fixture_id))}</span>
                              <StatusPill value={fixture.fixture_status} />
                            </div>
                            <p className="mt-1 text-xs text-muted">
                              {valueOf(fixture.tournament_stage)} · {valueOf(fixture.round_name)} · {dateOf(fixture.fixture_start_datetime)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState>Fixtures will appear here when generated.</EmptyState>
                    )}
                  </div>

                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                      Official results
                    </h4>
                    {participation?.results.length ? (
                      <div className="space-y-2">
                        {participation.results.map((result, index) => (
                          <div key={String(result.match_result_id ?? index)} className="rounded-lg border border-border p-3 text-sm">
                            <p className="font-medium">
                              {valueOf(result.player_goals)} – {valueOf(result.opponent_goals)}
                            </p>
                            <p className="mt-1 text-xs text-muted">
                              {valueOf(result.winning_method)} · {dateOf(result.verified_datetime)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState>Official results will appear here when available.</EmptyState>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                      Result submissions
                    </h4>
                    {participation?.submissions.length ? (
                      <div className="space-y-2">
                        {participation.submissions.map((submission, index) => (
                          <div key={String(submission.submission_id ?? index)} className="rounded-lg border border-border p-3 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">{valueOf(submission.submission_id)}</span>
                              <StatusPill value={submission.submission_status} />
                            </div>
                            <p className="mt-1 text-xs text-muted">{dateOf(submission.submitted_datetime)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState>Submissions will appear here when available.</EmptyState>
                    )}
                  </div>

                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                      Standings
                    </h4>
                    <EmptyState>Standings are not implemented yet.</EmptyState>
                    <h4 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-muted">
                      Awards and achievements
                    </h4>
                    <EmptyState>Awards and achievements will be added in a later phase.</EmptyState>
                  </div>
                </div>
              </>
            ) : (
              <EmptyState>
                This player does not have an official registration yet. Participation information will become available after registration approval.
              </EmptyState>
            )}
          </Section>

          {registration && (
            <Section title="Tournament disciplinary action">
              {registration.registration_status === "Disqualified" ? (
                <p className="text-sm text-muted">
                  This player is already disqualified from this tournament.
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted">
                    Disqualify this player from the selected tournament. This does not
                    impose a restriction across the tournament type.
                  </p>
          
                  {!showDisqualification ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDisqualificationError("");
                        setShowDisqualification(true);
                      }}
                      className="mt-4 min-h-11 rounded-lg border border-coral/40 px-4 text-sm font-semibold text-coral hover:bg-coral/10"
                    >
                      Disqualify from this tournament
                    </button>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium">
                          Disqualification reason (required)
                        </span>
                        <textarea
                          value={disqualificationReason}
                          onChange={(event) =>
                            setDisqualificationReason(event.target.value)
                          }
                          rows={3}
                          maxLength={2000}
                          placeholder="Explain why this player is being disqualified."
                          className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-cyan"
                        />
                      </label>
          
                      {disqualificationError && (
                        <p role="alert" className="text-sm text-coral">
                          {disqualificationError}
                        </p>
                      )}
          
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void submitDisqualification()}
                          disabled={
                            disqualificationBusy || !disqualificationReason.trim()
                          }
                          className="min-h-11 rounded-lg bg-coral px-4 text-sm font-semibold text-background disabled:opacity-50"
                        >
                          {disqualificationBusy
                            ? "Disqualifying…"
                            : "Confirm disqualification"}
                        </button>
          
                        <button
                          type="button"
                          onClick={() => {
                            setShowDisqualification(false);
                            setDisqualificationReason("");
                            setDisqualificationError("");
                          }}
                          disabled={disqualificationBusy}
                          className="min-h-11 rounded-lg border border-border px-4 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Section>
          )}
          
        </div>
      </div>

      <ImageViewer
        images={viewer?.images ?? []}
        initialIndex={viewer?.initialIndex ?? 0}
        isOpen={Boolean(viewer)}
        onClose={() => setViewer(null)}
      />
    </div>
  );
}

function RegistrationsPage() {
  const [searchParams] = useSearchParams();
  const tournamentId = searchParams.get("tournamentId")?.trim() ?? "";
  const location = useLocation();
  const navigate = useNavigate();

  const [directory, setDirectory] = useState<RegistrationDirectoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [requestStatus, setRequestStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [registrationStatus, setRegistrationStatus] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<RegistrationDirectoryItem | null>(null);
  const [tournamentMenuOpen, setTournamentMenuOpen] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (!tournamentId) {
      setLoading(false);
      setError("No tournament was selected. Open Registrations from a tournament card.");
      return;
    }

    if (manual) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const result = await getRegistrationDirectory(tournamentId, {
        search,
        requestStatus,
        paymentStatus,
        registrationStatus,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setDirectory(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load registrations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    tournamentId,
    search,
    requestStatus,
    paymentStatus,
    registrationStatus,
    page,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  const rows = directory?.registrations ?? [];
  const totalPages = Math.max(
    1,
    Math.ceil((directory?.total_count ?? 0) / PAGE_SIZE),
  );
  const tournamentName = valueOf(
    directory?.tournament?.tournament_name,
    "Selected tournament",
  );

  function goBack() {
    if (location.key !== "default") {
      navigate(-1);
    } else {
      navigate("/tournaments");
    }
  }

  function playerLabel(item: RegistrationDirectoryItem) {
    return item.player_name || item.manager_name || "Unknown player";
  }

  return (
    <div className="px-4 py-5 sm:px-6 lg:px-8">
      <header className="mb-6 rounded-2xl border border-border bg-panel p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan">
              <span>Tournament operations</span>
              <span className="text-muted">/</span>
              <span>Registration desk</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Registrations</h1>
            <p className="mt-1 max-w-2xl truncate text-sm text-muted">
              {tournamentName} · {tournamentId || "Tournament not selected"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium hover:border-cyan"
            >
              <ArrowLeft size={16} /> Back
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setTournamentMenuOpen((open) => !open)}
                aria-expanded={tournamentMenuOpen}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-cyan px-4 text-sm font-semibold text-background hover:opacity-90"
              >
                Tournament navigation <ChevronDown size={16} />
              </button>

              {tournamentMenuOpen && (
                <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-panel p-2 shadow-2xl">
                  {TOURNAMENT_SECTIONS.map((section) => (
                    <Link
                      key={section.path}
                      to={`${section.path}?tournamentId=${encodeURIComponent(tournamentId)}`}
                      onClick={() => setTournamentMenuOpen(false)}
                      className={`block rounded-lg px-3 py-2.5 text-sm hover:bg-surface hover:text-cyan ${
                        section.path === "/registrations"
                          ? "font-semibold text-cyan"
                          : "text-text"
                      }`}
                    >
                      {section.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => void load(true)}
              disabled={loading || refreshing || !tournamentId}
              aria-label="Refresh registrations"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border text-muted hover:border-cyan hover:text-cyan disabled:opacity-50"
            >
              <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </header>

      {!tournamentId ? (
        <div role="alert" className="rounded-xl border border-coral/30 bg-coral/10 p-5 text-sm text-coral">
          {error}
          <div className="mt-4">
            <Link to="/tournaments" className="font-semibold underline">
              Return to tournaments
            </Link>
          </div>
        </div>
      ) : (
        <>
          <section className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Metric
              label="All registration requests"
              value={directory?.summary.total ?? 0}
              icon={Users}
            />
            <Metric
              label="Awaiting payment verification"
              value={directory?.summary.awaiting_verification ?? 0}
              icon={Clock3}
              accent="text-gold"
            />
            <Metric
              label="Official registrations"
              value={directory?.summary.registered ?? 0}
              icon={CheckCircle2}
              accent="text-green"
            />
            <Metric
              label="Refund required"
              value={directory?.summary.refund_required ?? 0}
              icon={Wallet}
              accent="text-coral"
            />
          </section>

          <section className="rounded-2xl border border-border bg-panel">
            <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-semibold">Registration records</h2>
                <p className="mt-1 text-xs text-muted">
                  Requests and approved registrations are shown together.
                </p>
              </div>

              <div className="relative w-full lg:max-w-sm">
                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(0);
                  }}
                  placeholder="Search player, ID, email or squad…"
                  className="min-h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-cyan"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 border-b border-border p-4 sm:grid-cols-3">
              <select
                value={requestStatus}
                onChange={(event) => {
                  setRequestStatus(event.target.value);
                  setPage(0);
                }}
                className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="">All request statuses</option>
                {[
                  "Pending Payment",
                  "Awaiting Verification",
                  "Approved",
                  "Rejected",
                  "Expired",
                  "Cancelled",
                  "Refund Required",
                ].map((value) => <option key={value}>{value}</option>)}
              </select>

              <select
                value={paymentStatus}
                onChange={(event) => {
                  setPaymentStatus(event.target.value);
                  setPage(0);
                }}
                className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="">All payment statuses</option>
                {[
                  "Pending",
                  "Processing",
                  "Success",
                  "Failed",
                  "Cancelled",
                  "Expired",
                  "Rejected",
                ].map((value) => <option key={value}>{value}</option>)}
              </select>

              <select
                value={registrationStatus}
                onChange={(event) => {
                  setRegistrationStatus(event.target.value);
                  setPage(0);
                }}
                className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="">All registration statuses</option>
                {[
                  "Registered",
                  "Active",
                  "Eliminated",
                  "Disqualified",
                  "Withdrawn",
                  "Completed",
                ].map((value) => <option key={value}>{value}</option>)}
              </select>
            </div>

            {error && (
              <div role="alert" className="m-4 flex items-start gap-2 rounded-lg border border-coral/30 bg-coral/10 p-3 text-sm text-coral">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-background/70 text-xs text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Player</th>
                    <th className="px-4 py-3 font-medium">Player ID</th>
                    <th className="px-4 py-3 font-medium">Squad</th>
                    <th className="px-4 py-3 font-medium">Registration status</th>
                    <th className="px-4 py-3 font-medium">Payment status</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted">
                        Loading registration records…
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted">
                        No registration records match these filters.
                      </td>
                    </tr>
                  ) : (
                    rows.map((item) => (
                      <tr key={item.registration_reference_id} className="hover:bg-surface/50">
                        <td className="px-4 py-3">
                          <p className="font-semibold">{playerLabel(item)}</p>
                          <p className="mt-1 text-xs text-muted">
                            {item.player_email || item.request_email || "No email"}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {valueOf(item.player_id)}
                        </td>
                        <td className="px-4 py-3">{valueOf(item.squad_name)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-1.5">
                            <StatusPill value={item.registration_status ?? item.request_status} />
                            <span className="text-[11px] text-muted">
                              {item.registration_id ? "Official registration" : "Request"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill value={item.payment_status ?? "No transaction"} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelected(item)}
                            className="min-h-10 rounded-lg border border-border px-3 text-xs font-semibold hover:border-cyan hover:text-cyan"
                          >
                            View details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <footer className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted">
                {directory
                  ? `Showing ${directory.total_count === 0 ? 0 : page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, directory.total_count)} of ${directory.total_count}`
                  : "—"}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 0 || loading}
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-border px-3 text-xs disabled:opacity-40"
                >
                  <ChevronLeft size={15} /> Previous
                </button>
                <span className="px-2 text-xs text-muted">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page + 1 >= totalPages || loading}
                  onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                  className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-border px-3 text-xs disabled:opacity-40"
                >
                  Next <ChevronRight size={15} />
                </button>
              </div>
            </footer>
          </section>
        </>
      )}

      {selected && tournamentId && (
        <RegistrationDetail
          tournamentId={tournamentId}
          item={selected}
          onClose={() => setSelected(null)}
          onChanged={async () => {
            await load(true);
          }}
        />
      )}
    </div>
  );
}

export default RegistrationsPage;
