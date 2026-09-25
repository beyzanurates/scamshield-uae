import demo1 from "@/data/demo/demo-1.json";
import demo2 from "@/data/demo/demo-2.json";
import demo3 from "@/data/demo/demo-3.json";
import demo4 from "@/data/demo/demo-4.json";
import { demoFixtureSchema, type DemoFixture } from "@/lib/schemas";

export const demoFixtures: DemoFixture[] = [demo1, demo2, demo3, demo4].map((fixture) =>
  demoFixtureSchema.parse(fixture)
);

export function getDemoFixture(id: string): DemoFixture | undefined {
  return demoFixtures.find((fixture) => fixture.id === id);
}
