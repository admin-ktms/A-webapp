
import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, LoaderCircle, X } from "lucide-react";

import {
  createTournament,
  getTournamentTypeOptions,
  type CreatedTournament,
  type TournamentTypeOption,
} from "../../features/tournamentCreationService";

type Props = {
  onClose: () => void;
  onCreated: (tournament: CreatedTournament) => Promise<void>;
};

function isImplementedType(type: TournamentTypeOption): boolean {
  return (
    type.tournament_type_id === "KT" &&
    type.tournament_type_status.toLowerCase() === "active"
  );
}

function TournamentCreationForm({ onClose, onCreated }: Props) {
  const [types, setTypes] = useState<TournamentTypeOption[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typeError, setTypeError] = useState("");

  const [tournamentTypeId, setTournamentTypeId] = useState("KT");
  const [tournamentName, setTournamentName] = useState("");
  const [registrationOpenDatetime, setRegistrationOpenDatetime] =
    useState("");
  const [minimumAge, setMinimumAge] = useState("18");
  const [registrationFee, setRegistrationFee] = useState("1000");
  const [maximumPlayers, setMaximumPlayers] = useState("100");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadTypes() {
      setTypesLoading(true);
      setTypeError("");

      try {
        const options = await getTournamentTypeOptions();

        if (!mounted) return;

        setTypes(options);

        const activeKt = options.find(isImplementedType);
        setTournamentTypeId(activeKt?.tournament_type_id ?? "");
      } catch (err: unknown) {
        if (!mounted) return;

        setTypeError(
          err instanceof Error
            ? err.message
            : "Unable to load tournament types.",
        );
      } finally {
        if (mounted) setTypesLoading(false);
      }
    }

    void loadTypes();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedType = types.find(
    (type) => type.tournament_type_id === tournamentTypeId,
  );

  const canCreate =
    !typesLoading &&
    !typeError &&
    !!selectedType &&
    isImplementedType(selectedType);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!selectedType || !isImplementedType(selectedType)) {
      setError(
        "This tournament type does not have an implemented creation workflow yet.",
      );
      return;
    }

    const age = Number(minimumAge);
    const fee = Number(registrationFee);
    const players = Number(maximumPlayers);

    if (!Number.isInteger(age) || age < 18) {
      setError("Minimum participant age must be 18 or older.");
      return;
    }

    if (!Number.isFinite(fee) || fee < 0) {
      setError("Registration fee must be zero or greater.");
      return;
    }

    if (!Number.isInteger(players) || players <= 0) {
      setError("Maximum players must be greater than zero.");
      return;
    }

    setSubmitting(true);

    try {
      const created = await createTournament({
        tournamentTypeId,
        tournamentName,
        registrationOpenDatetime,
        minimumAge: age,
        registrationFee: fee,
        maximumPlayers: players,
      });

      await onCreated(created);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Tournament creation failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const fieldClass =
    "mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-text outline-none focus:border-cyan focus:ring-1 focus:ring-cyan disabled:opacity-60";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-tournament-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-border bg-panel shadow-2xl sm:rounded-2xl"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-panel p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan">
              Tournament operations
            </p>
            <h2
              id="create-tournament-title"
              className="mt-1 text-xl font-bold"
            >
              Create tournament
            </h2>
            <p className="mt-1 text-sm text-muted">
              Configure the inputs supported by the selected tournament type.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close tournament creation"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border text-muted hover:border-cyan hover:text-cyan disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          {typeError && (
            <div
              role="alert"
              className="rounded-lg border border-coral/40 bg-coral/10 p-3 text-sm text-coral"
            >
              {typeError}
            </div>
          )}

          <label className="block text-sm font-medium">
            Tournament type
            <select
              value={tournamentTypeId}
              onChange={(event) => {
                setTournamentTypeId(event.target.value);
                setError("");
              }}
              disabled={typesLoading || submitting || !!typeError}
              className={fieldClass}
              required
            >
              <option value="" disabled>
                Select a tournament type
              </option>

              {types.map((type) => {
                const implemented = isImplementedType(type);

                return (
                  <option
                    key={type.tournament_type_id}
                    value={type.tournament_type_id}
                    disabled={!implemented}
                  >
                    {type.tournament_type_name}
                    {!implemented ? " — Not implemented yet" : ""}
                  </option>
                );
              })}
            </select>
            <span className="mt-1 block text-xs font-normal text-muted">
              KT creation is implemented. Other tournament types will receive
              their own reactive forms when their backend requirements are ready.
            </span>
          </label>

          {selectedType && !isImplementedType(selectedType) && (
            <div className="rounded-lg border border-border bg-background/60 p-4">
              <h3 className="font-semibold">
                {selectedType.tournament_type_name}
              </h3>
              <p className="mt-1 text-sm text-muted">
                Configuration fields for this tournament type have not been
                implemented. No creation request will be sent.
              </p>
            </div>
          )}

          {selectedType && isImplementedType(selectedType) && (
            <>
              <label className="block text-sm font-medium">
                Tournament name
                <input
                  value={tournamentName}
                  onChange={(event) => setTournamentName(event.target.value)}
                  className={fieldClass}
                  placeholder="Enter tournament name"
                  maxLength={200}
                  required
                  disabled={submitting}
                />
              </label>

              <label className="block text-sm font-medium">
                Registration opens (Lagos time)
                <input
                  type="datetime-local"
                  value={registrationOpenDatetime}
                  onChange={(event) =>
                    setRegistrationOpenDatetime(event.target.value)
                  }
                  className={fieldClass}
                  required
                  disabled={submitting}
                />
                <span className="mt-1 block text-xs font-normal text-muted">
                  Registration closing and tournament dates are calculated by
                  the backend.
                </span>
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  Minimum participant age
                  <input
                    type="number"
                    min={18}
                    step={1}
                    value={minimumAge}
                    onChange={(event) => setMinimumAge(event.target.value)}
                    className={fieldClass}
                    required
                    disabled={submitting}
                  />
                  <span className="mt-1 block text-xs font-normal text-muted">
                    Must be at least 18.
                  </span>
                </label>

                <label className="block text-sm font-medium">
                  Registration fee
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={registrationFee}
                    onChange={(event) => setRegistrationFee(event.target.value)}
                    className={fieldClass}
                    required
                    disabled={submitting}
                  />
                  <span className="mt-1 block text-xs font-normal text-muted">
                    Currency is resolved by the backend.
                  </span>
                </label>

                <label className="block text-sm font-medium sm:col-span-2">
                  Maximum players
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={maximumPlayers}
                    onChange={(event) => setMaximumPlayers(event.target.value)}
                    className={fieldClass}
                    required
                    disabled={submitting}
                  />
                  <span className="mt-1 block text-xs font-normal text-muted">
                    Enter the desired capacity. The backend enforces the
                    applicable rules; there is no frontend maximum cap.
                  </span>
                </label>
              </div>
            </>
          )}

          {error && (
            <div
              role="alert"
              className="flex gap-2 rounded-lg border border-coral/40 bg-coral/10 p-3 text-sm text-coral"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <footer className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="min-h-11 rounded-lg border border-border px-4 text-sm font-medium hover:border-cyan disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!canCreate || submitting}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-cyan px-5 text-sm font-semibold text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && (
                <LoaderCircle size={16} className="animate-spin" />
              )}
              {submitting ? "Creating…" : "Create tournament"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default TournamentCreationForm;
