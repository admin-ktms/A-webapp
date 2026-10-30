import { supabase } from "../lib/supabase";

export type RegistrationFilters = {
  search?: string;
  requestStatus?: string;
  paymentStatus?: string;
  registrationStatus?: string;
  limit?: number;
  offset?: number;
};

export type RegistrationDirectoryItem = {
  registration_reference_id: string;
  player_id: string | null;
  manager_name: string | null;
  player_name: string | null;
  player_email: string | null;
  request_email: string | null;
  player_status: string | null;
  squad_name: string | null;
  request_status: string;
  payment_status: string | null;
  payment_provider: string | null;
  payment_amount: number | string | null;
  payment_currency: string | null;
  registration_id: string | null;
  registration_status: string | null;
  registration_datetime: string | null;
  request_datetime: string | null;
  payment_deadline_datetime: string | null;
  current_stage: string | null;
};

export type RegistrationDirectoryResponse = {
  success: boolean;
  code: string;
  tournament: Record<string, unknown>;
  summary: {
    total: number;
    pending_payment: number;
    awaiting_verification: number;
    registered: number;
    refund_required: number;
  };
  total_count: number;
  limit: number;
  offset: number;
  registrations: RegistrationDirectoryItem[];
};

export type RegistrationDetailsResponse = {
  success: boolean;
  code: string;
  tournament: Record<string, unknown>;
  registration: {
    request: Record<string, unknown>;
    official_registration: Record<string, unknown> | null;
  };
  player: Record<string, unknown> | null;
  squad: {
    details: Record<string, unknown> | null;
    screenshots: Array<Record<string, unknown>>;
  };
  payment: {
    current_transaction: Record<string, unknown> | null;
    transaction_history: Array<Record<string, unknown>>;
    verification_available: boolean;
  };
  participation: {
    summary: Record<string, unknown>;
    fixtures: Array<Record<string, unknown>>;
    results: Array<Record<string, unknown>>;
    submissions: Array<Record<string, unknown>>;
    group: Record<string, unknown> | null;
    standings: Record<string, unknown>;
  };
  availability: Record<string, boolean>;
};

export type SignedPaymentProof = {
  transaction_history_id: string;
  expires_in_seconds: number;
  proof: {
    signed_url: string;
    mime_type: string;
  } | null;
};

export type BankTransferDecision = {
  success: boolean;
  reason_code: string;
  registration_reference_id: string | null;
  transaction_history_id: string | null;
  registration_id: string | null;
  payment_status: string | null;
  request_status: string | null;
  registration_status: string | null;
  payment_verified_datetime: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export async function getRegistrationDirectory(
  tournamentId: string,
  filters: RegistrationFilters = {},
): Promise<RegistrationDirectoryResponse> {
  if (!tournamentId.trim()) throw new Error("A tournament is required.");

  const { data, error } = await supabase
    .schema("kt")
    .rpc("admin_list_tournament_registrations", {
      p_tournament_id: tournamentId,
      p_search: filters.search?.trim() || null,
      p_request_status: filters.requestStatus || null,
      p_payment_status: filters.paymentStatus || null,
      p_registration_status: filters.registrationStatus || null,
      p_limit: filters.limit ?? 50,
      p_offset: filters.offset ?? 0,
    });

  if (error) throw new Error(error.message);

  const response = asRecord(data);
  if (
    !response ||
    response.success !== true ||
    !Array.isArray(response.registrations) ||
    !asRecord(response.summary)
  ) {
    throw new Error("The registration directory returned an invalid response.");
  }

  return response as unknown as RegistrationDirectoryResponse;
}

export async function getRegistrationDetails(
  tournamentId: string,
  registrationReferenceId: string,
): Promise<RegistrationDetailsResponse> {
  const { data, error } = await supabase
    .schema("kt")
    .rpc("admin_get_tournament_registration_details", {
      p_tournament_id: tournamentId,
      p_registration_reference_id: registrationReferenceId,
    });

  if (error) throw new Error(error.message);

  const response = asRecord(data);
  if (
    !response ||
    response.success !== true ||
    !asRecord(response.registration) ||
    !asRecord(response.payment)
  ) {
    throw new Error("The registration detail service returned an invalid response.");
  }

  return response as unknown as RegistrationDetailsResponse;
}

export async function getRegistrationPaymentProof(
  tournamentId: string,
  registrationReferenceId: string,
  transactionHistoryId: string,
): Promise<SignedPaymentProof> {
  const { data, error } = await supabase.functions.invoke(
    "view-reg-payment-proof",
    {
      body: {
        tournament_id: tournamentId,
        registration_reference_id: registrationReferenceId,
        transaction_history_id: transactionHistoryId,
      },
    },
  );

  if (error) throw new Error("Unable to retrieve payment proof.");

  const response = asRecord(data);
  if (
    !response ||
    response.transaction_history_id !== transactionHistoryId ||
    typeof response.expires_in_seconds !== "number"
  ) {
    throw new Error("The payment-proof service returned an invalid response.");
  }

  if (response.proof === null) {
    return response as unknown as SignedPaymentProof;
  }

  const proof = asRecord(response.proof);
  if (
    !proof ||
    typeof proof.signed_url !== "string" ||
    !proof.signed_url.startsWith("https://") ||
    typeof proof.mime_type !== "string"
  ) {
    throw new Error("The payment-proof service returned an invalid file link.");
  }

  return response as unknown as SignedPaymentProof;
}

export async function decideBankTransferPayment(
  registrationReferenceId: string,
  decision: "approve" | "reject",
  rejectionReason?: string,
): Promise<BankTransferDecision> {
  if (!registrationReferenceId.trim()) {
    throw new Error("A registration reference is required.");
  }

  if (decision === "reject" && !rejectionReason?.trim()) {
    throw new Error("A rejection reason is required.");
  }

  const { data, error } = await supabase
    .schema("kt")
    .rpc("verify_bank_transfer_payment", {
      p_registration_reference_id: registrationReferenceId,
      p_decision: decision,
      p_rejection_reason:
        decision === "reject" ? rejectionReason!.trim() : null,
    });

  if (error) throw new Error(error.message);

  const row = Array.isArray(data) ? asRecord(data[0]) : asRecord(data);
  if (!row || typeof row.success !== "boolean") {
    throw new Error("The payment-verification service returned an invalid response.");
  }

  return row as unknown as BankTransferDecision;
}

export async function getRegistrationSquadScreenshots(
  tournamentId: string,
  registrationReferenceId: string,
): Promise<Array<{ signedUrl: string; objectPath: string }>> {
  const { data, error } = await supabase.functions.invoke(
    "view-squad-screenshot",
    {
      body: {
        operation: "registration",
        tournament_id: tournamentId,
        registration_reference_id: registrationReferenceId,
      },
    },
  );

  if (error) {
    throw new Error("Unable to retrieve registration squad screenshots.");
  }

  const response = asRecord(data);

  if (
    !response ||
    response.registration_reference_id !== registrationReferenceId ||
    !Array.isArray(response.screenshots)
  ) {
    throw new Error(
      "The registration screenshot service returned an invalid response.",
    );
  }

  return response.screenshots.map((item: unknown) => {
    const screenshot = asRecord(item);

    if (
      !screenshot ||
      typeof screenshot.signed_url !== "string" ||
      !screenshot.signed_url.startsWith("https://") ||
      typeof screenshot.object_path !== "string"
    ) {
      throw new Error(
        "The registration screenshot service returned an invalid image.",
      );
    }

    return {
      signedUrl: screenshot.signed_url,
      objectPath: screenshot.object_path,
    };
  });
}
