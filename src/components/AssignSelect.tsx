"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Member { id: string; full_name: string }

export default function AssignSelect({
  submissionId,
  currentAssignee,
  members,
}: {
  submissionId: string;
  currentAssignee: string | null;
  members: Member[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [value, setValue] = useState(currentAssignee ?? "");
  const [saving, setSaving] = useState(false);

  async function handleChange(newValue: string) {
    setValue(newValue);
    setSaving(true);
    await supabase
      .from("report_submissions")
      .update({ assigned_to: newValue || null })
      .eq("id", submissionId);
    setSaving(false);
    router.refresh();
  }

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      disabled={saving}
      className="bg-transparent border-b border-base-line text-xs text-ink-dim focus:outline-none focus:border-signal-amber"
    >
      <option value="">- belum ditugaskan -</option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>{m.full_name}</option>
      ))}
    </select>
  );
}
