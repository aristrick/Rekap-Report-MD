import Spinner from "@/components/Spinner";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size={28} className="text-signal-amber" />
    </div>
  );
}
