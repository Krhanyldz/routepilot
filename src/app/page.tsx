import { DemoHomeExperience } from "@/components/demo-home-experience";
import { LiveSearchExperience } from "@/components/live-search-experience";
import { readRouteDataMode } from "@/providers/production/amadeus";

export default function Home() {
  return readRouteDataMode() === "live" ? <LiveSearchExperience /> : <DemoHomeExperience />;
}
