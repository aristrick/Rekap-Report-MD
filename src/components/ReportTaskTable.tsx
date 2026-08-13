"use client";

import { useState } from "react";
import ReportTaskModal, { type TaskRow } from "./ReportTaskModal";
import { STATUS_LABEL } from "@/lib/telegram";

export default function ReportTaskTable({
  rows,
  rowLabel,
  canManage,
}: {
  rows: (TaskRow & { name: string })[];
  rowLabel: string;
  canManage: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const openTask = rows.find((r) => r.id === openId) ?? null;

  return (
    <>
      <div className="card overflow-x-auto !p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-dim border-b border-base-line bg-base">
              <th className="px-4 py-3 font-normal">{rowLabel}</th>
              <th className="px-4 py-3 font-normal">Ditugaskan ke</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal">File</th>
              <th className="px-4 py-3 font-normal"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-base-line">
            {rows.map((r) => (
              <tr
                key={r.id}
                onClick={() => setOpenId(r.id)}
                className="cursor-pointer hover:bg-base transition"
              >
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3 text-ink-dim">{r.assignedToName}</td>
                <td className="px-4 py-3">
                  <span className={`status-pill status-${r.status}`}>{STATUS_LABEL[r.status] ?? r.status}</span>
                </td>
                <td className="px-4 py-3 text-ink-dim text-xs">
                  {r.fileUrl ? `📎 ${r.fileName || "file"}` : "—"}
                </td>
                <td className="px-4 py-3 text-right text-xs text-signal-amber">Detail →</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openTask && (
        <ReportTaskModal task={openTask} canManage={canManage} onClose={() => setOpenId(null)} />
      )}
    </>
  );
}
