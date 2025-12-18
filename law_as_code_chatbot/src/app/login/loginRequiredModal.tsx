import Link from "next/link";
import { X } from "lucide-react";

export default function LoginRequiredModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
        >
          <X size={18} />
        </button>

        <h2 className="text-lg font-semibold text-gray-900">
          Login required
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          You must be logged in to use the chatbot.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/login"
            className="rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
          >
            Log in
          </Link>

          <Link
            href="/register"
            className="rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
