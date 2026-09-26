"use client";

import { useState } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function RevisionEmptyPopup() {
  const [open, setOpen] = useState(true);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nothing to revise yet</DialogTitle>
          <DialogDescription>
            You haven&apos;t studied anything yet — revision tracking starts once you mark topics
            as complete. Study a topic or two first, then come back here.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button asChild>
            <Link href="/study">Go study</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
