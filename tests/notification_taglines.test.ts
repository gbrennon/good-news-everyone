import { expect, test } from "bun:test";
import type { NotificationEvent } from "../src/contracts";
import {
  NotificationTaglineSelector,
  RandomSource,
} from "../src/notification_taglines";

const expectedTaglines: Record<NotificationEvent, readonly string[]> = {
  question: [
    "What-mas?",
    "Why, why, why didn't I break his legs?",
    "Isn't it obvious?",
  ],
  complete: [
    "Good news, everyone! We've got a very special delivery today.",
    "Good news, everyone! I've taught the toaster to feel love!",
    "Well, then good news! It's a suppository.",
  ],
  error: [
    "Good news, everyone! There's a report on TV with some very bad news!",
    "Good news, everyone! The university is bringing me up on disciplinary charges.",
    "Oh, dear! She's stuck in an infinite loop, and he's an idiot!",
  ],
};

const notificationEvents: readonly NotificationEvent[] = [
  "question",
  "complete",
  "error",
];

const randomSelections = [[0, 0], [0.5, 1], [0.99, 2]] as const;

const taglineSelections = notificationEvents.flatMap((event) =>
  [0, 0.5, 0.99].map((randomValue) => ({ event, randomValue })),
);
class TaglineSelectionFixture {
  public select(event: NotificationEvent, randomValue: number): string {
    return new NotificationTaglineSelector(
      new RandomSource(() => randomValue),
    ).select(event);
  }
}

const taglineSelectionFixture = new TaglineSelectionFixture();

function expectTaglineInEventCatalog(
  event: NotificationEvent,
  randomValue: number,
): void {
  const tagline = taglineSelectionFixture.select(event, randomValue);
  const otherEvents = notificationEvents.filter((candidate) => candidate !== event);

  expect(expectedTaglines[event]).toContain(tagline);
  for (const otherEvent of otherEvents) {
    expect(expectedTaglines[otherEvent]).not.toContain(tagline);
  }
}

test("selects each notification tagline by random index", () => {
  for (const event of notificationEvents) {
    for (const [randomValue, index] of randomSelections) {
      const tagline = taglineSelectionFixture.select(event, randomValue);

      expect(tagline).toBe(expectedTaglines[event][index]);
    }
  }
});

test("clamps random values outside the selector range", () => {
  for (const event of notificationEvents) {
    expect(taglineSelectionFixture.select(event, -1)).toBe(expectedTaglines[event][0]);
    expect(taglineSelectionFixture.select(event, 2)).toBe(expectedTaglines[event][2]);
    expect(taglineSelectionFixture.select(event, Number.NaN)).toBe(
      expectedTaglines[event][0],
    );
    expect(taglineSelectionFixture.select(event, Number.POSITIVE_INFINITY)).toBe(
      expectedTaglines[event][0],
    );
  }
});

test("keeps tagline catalogs isolated by notification event", () => {
  for (const { event, randomValue } of taglineSelections) {
    expectTaglineInEventCatalog(event, randomValue);
  }
});
