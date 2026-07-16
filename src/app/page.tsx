import { ConfigError } from "@/components/ui/config-error";
import { StepIndicator } from "@/components/ui/step-indicator";
import { WaitingRoom } from "@/components/waiting-room/waiting-room";
import { BroadcastPanel } from "@/components/broadcast/broadcast-panel";
import { getPublicEnv } from "@/lib/env";
export default function Home() {
  const env = getPublicEnv();
  if (!env.valid) return <ConfigError message={env.error!} />;
  return (
    <main className="shell">
      <StepIndicator current={0} />
      <BroadcastPanel />
      <WaitingRoom />
    </main>
  );
}
