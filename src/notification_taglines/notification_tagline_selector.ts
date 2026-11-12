import type { NotificationEvent } from "../contracts";
import { RandomSource } from "./random_source";
import type { NotificationTagline } from "./notification_tagline";

export class NotificationTaglineSelector {
  private static readonly TAGLINES: Readonly<
    Record<NotificationEvent, readonly NotificationTagline[]>
  > = {
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
      {
        title: "Good news, everyone!",
        body: "We've got a very special delivery today.",
      },
      {
        title: "Good news, everyone!",
        body: "I've taught the toaster to feel love!",
      },
      { title: "Well, then good news!", body: "It's a suppository." },
      { title: "Good news, everyone!", body: "We've been hired to deliver an envelope." },
      { title: "Good news, everyone!", body: "He's made a complete recovery." },
      { title: "Good news, Leela!", body: "I landed the contract to empty the spittoons." },
      { title: "Good news, everyone!", body: "The customer paid in advance." },
      { title: "Good news, everyone!", body: "The invention is ready for a completely safe test." },
    ],
    error: [
      {
        title: "Good news, everyone!",
        body: "There's a report on TV with some very bad news!",
      },
      {
        title: "Good news, everyone!",
        body: "The university is bringing me up on disciplinary charges.",
      },
      {
        title: "Oh, dear!",
        body: "She's stuck in an infinite loop, and he's an idiot!",
      },
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

  private readonly random: RandomSource;

  public constructor(random: RandomSource = new RandomSource()) {
    this.random = random;
  }

  public select(event: NotificationEvent): NotificationTagline {
    const taglines = NotificationTaglineSelector.TAGLINES[event];
    const randomValue = this.random.next();
    if (!Number.isFinite(randomValue) || randomValue <= 0) {
      return taglines[0];
    }
    const index = randomValue >= 1
      ? taglines.length - 1
      : Math.min(Math.floor(randomValue * taglines.length), taglines.length - 1);
    return taglines[index];
  }
}
