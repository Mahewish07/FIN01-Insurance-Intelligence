import Link from "next/link";
import { StateBlock } from "@/components/common/StateBlock";

export default function NotFound() {
  return (
    <StateBlock
      kind="empty"
      title="Page not found"
      body="The page you're looking for doesn't exist."
      action={<Link href="/" className="inline-flex h-10 items-center rounded-lg bg-brand-700 px-4 text-sm font-medium text-white">Back to dashboard</Link>}
    />
  );
}
