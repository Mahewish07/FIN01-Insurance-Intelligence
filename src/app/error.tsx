"use client";

import { StateBlock } from "@/components/common/StateBlock";
import { Button, Card } from "@/components/common/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <Card>
      <StateBlock kind="server_error" action={<Button onClick={reset}>Try again</Button>} />
    </Card>
  );
}
