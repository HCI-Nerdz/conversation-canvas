import { STATUS_LABEL, type InboxStatus } from "../core/model.ts";

export function ChatThreadDemo({
  blurb,
  standinNote,
}: {
  blurb: string;
  standinNote?: string;
}) {
  return (
    <div className="chat-thread-expanded">
      <p className="bubble user">Can you pick this back up where we left off?</p>
      <p className="bubble agent">{blurb}</p>
      <p className="bubble user">Yes — keep going on that thread.</p>
      <p className="bubble agent">
        Still on it. I will post an update when the next checkpoint lands.
      </p>
      {standinNote ? <p className="chat-note">{standinNote}</p> : null}
    </div>
  );
}

export function chatStatusLabel(status: InboxStatus): string {
  return STATUS_LABEL[status];
}
