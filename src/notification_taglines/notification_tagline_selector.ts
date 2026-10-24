import type { NotificationEvent } from "../contracts";
import { RandomSource } from "./random_source";

/**
 * Select category-specific Professor Farnsworth taglines.
 */
export class NotificationTaglineSelector {
  private static readonly TAGLINES: Readonly<Record<NotificationEvent, readonly string[]>> = {
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

  private readonly random: RandomSource;

  public constructor(random: RandomSource = new RandomSource()) {
    this.random = random;
  }

  /**
   * Select a tagline for the requested notification event.
   */
  public select(event: NotificationEvent): string {
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
