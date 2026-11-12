import { expect, test } from "bun:test";
import type { NotificationEvent } from "../src/contracts";
import {
  NotificationTaglineSelector,
  RandomSource,
  type NotificationTagline,
} from "../src/notification_taglines";

const expectedTaglines: Record<NotificationEvent, readonly NotificationTagline[]> = {
  question: [
    { title: "What-mas?", body: "What do you need from the crew?" },
    {
      title: "Why, why, why didn't I break his legs?",
      body: "A question for another dangerous experiment.",
    },
    { title: "Isn't it obvious?", body: "The answer is probably less safe than the question." },
    {
      title: "What is the matter?",
      body: "Nothing is the matter now that I have turbocharged it.",
    },
    { title: "Why is that good news?", body: "Because someone else paid in advance." },
    { title: "What's the matter compressor?", body: "Nothing is the matter." },
    { title: "Can we ask a question?", body: "Only if the answer survives the experiment." },
    { title: "Is this ordinary honey?", body: "This is no ordinary honey." },
  ],
  complete: [
    { title: "Good news, everyone!", body: "We've got a very special delivery today." },
    { title: "Good news, everyone!", body: "I've taught the toaster to feel love!" },
    { title: "Well, then good news!", body: "It's a suppository." },
    { title: "Good news, everyone!", body: "We've been hired to deliver an envelope." },
    { title: "Good news, everyone!", body: "He's made a complete recovery." },
    { title: "Good news, Leela!", body: "I landed the contract to empty the spittoons." },
    { title: "Good news, everyone!", body: "The customer paid in advance." },
    { title: "Good news, everyone!", body: "The invention is ready for a completely safe test." },
  ],
  error: [
    { title: "Good news, everyone!", body: "There's a report on TV with some very bad news!" },
    {
      title: "Good news, everyone!",
      body: "The university is bringing me up on disciplinary charges.",
    },
    { title: "Oh, dear!", body: "She's stuck in an infinite loop, and he's an idiot!" },
    { title: "Good news, everyone!", body: "I'm in terrible pain." },
    { title: "Good news, everyone!", body: "The experiment has escaped the laboratory." },
    {
      title: "Well, then good news!",
      body: "The machine failed in a scientifically interesting way.",
    },
    { title: "Oh, dear!", body: "The safety system is now part of the emergency." },
    { title: "Good news, everyone!", body: "The bad news arrived ahead of schedule." },
  ],
};

const notificationEvents: readonly NotificationEvent[] = [
  "question",
  "complete",
  "error",
];

const randomSelections = [[0, 0], [0.5, 4], [0.99, 7]] as const;

class TaglineSelectionFixture {
  public select(event: NotificationEvent, randomValue: number): NotificationTagline {
    return new NotificationTaglineSelector(
      new RandomSource(() => randomValue),
    ).select(event);
  }
}

const taglineSelectionFixture = new TaglineSelectionFixture();

test("selects an opening phrase and body tagline separately", () => {
  const selected = new NotificationTaglineSelector(
    new RandomSource(() => 0),
  ).select("complete");

  expect(selected).toEqual(expectedTaglines.complete[0]);
});

function expectTaglineInEventCatalog(
  event: NotificationEvent,
  randomValue: number,
): void {
  const tagline = taglineSelectionFixture.select(event, randomValue);
  const otherEvents = notificationEvents.filter((candidate) => candidate !== event);

  expect(expectedTaglines[event]).toContainEqual(tagline);
  for (const otherEvent of otherEvents) {
    expect(expectedTaglines[otherEvent]).not.toContainEqual(tagline);
  }
}

test("selects each notification tagline by random index", () => {
  for (const event of notificationEvents) {
    for (const [randomValue, index] of randomSelections) {
      const tagline = taglineSelectionFixture.select(event, randomValue);

      expect(tagline).toEqual(expectedTaglines[event][index]);
    }
  }
});

test("clamps random values outside the selector range", () => {
  for (const event of notificationEvents) {
    expect(taglineSelectionFixture.select(event, -1)).toEqual(expectedTaglines[event][0]);
    expect(taglineSelectionFixture.select(event, 2)).toEqual(expectedTaglines[event][7]);
    expect(taglineSelectionFixture.select(event, Number.NaN)).toEqual(
      expectedTaglines[event][0],
    );
    expect(taglineSelectionFixture.select(event, Number.POSITIVE_INFINITY)).toEqual(
      expectedTaglines[event][0],
    );
  }
});

test("keeps tagline catalogs isolated by notification event", () => {
  for (const event of notificationEvents) {
    for (const [randomValue] of randomSelections) {
      expectTaglineInEventCatalog(event, randomValue);
    }
  }
});
