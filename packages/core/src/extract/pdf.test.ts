import { describe, expect, it } from "vitest";
import { chooseTitle, clean, deriveTitle, isJunkTitle } from "./pdf.js";

describe("clean", () => {
	it("strips emoji from a title", () => {
		expect(clean("🦩 Flamingo: a Visual Language Model")).toBe("Flamingo: a Visual Language Model");
	});

	it("leaves a normal mixed-case title (and its acronyms) untouched", () => {
		expect(clean("Attention Is All You Need")).toBe("Attention Is All You Need");
		expect(clean("BERT: Pre-training of Deep Bidirectional Transformers")).toBe("BERT: Pre-training of Deep Bidirectional Transformers");
		expect(clean("LLaMA: Open and Efficient Foundation Language Models")).toBe("LLaMA: Open and Efficient Foundation Language Models");
	});

	it("title-cases a SHOUTING title and lowercases small words", () => {
		expect(clean("REACT : SYNERGIZING REASONING AND ACTING IN LANGUAGE MODELS")).toBe("React: Synergizing Reasoning and Acting in Language Models");
		expect(clean("NEURAL MACHINE TRANSLATION")).toBe("Neural Machine Translation");
	});

	it("fixes stray spaces around punctuation and hyphens", () => {
		expect(clean("SELF -CONSISTENCY IMPROVES CHAIN OF THOUGHT")).toBe("Self-Consistency Improves Chain of Thought");
		expect(clean("FINETUNED LANGUAGE MODELS ARE ZERO -SHOT")).toBe("Finetuned Language Models Are Zero-Shot");
	});

	it("keeps verbs capitalized in title case", () => {
		expect(clean("MODELS ARE FEW-SHOT LEARNERS")).toContain("Are");
	});
});

describe("isJunkTitle", () => {
	it("rejects a figure filename embedded as a title", () => {
		expect(isJunkTitle("countries.capitals.projections.eps")).toBe(true);
	});
	it("rejects journal review-cycle boilerplate", () => {
		expect(isJunkTitle("Submitted 1/20; Revised 6/20; Published 6/20")).toBe(true);
		expect(isJunkTitle("Submitted 8/21; Revised 3/22; Published 4/22")).toBe(true);
	});
	it("accepts a real title", () => {
		expect(isJunkTitle("Attention Is All You Need")).toBe(false);
		expect(isJunkTitle("Efficient Estimation of Word Representations in Vector Space")).toBe(false);
	});
});

describe("deriveTitle", () => {
	it("skips journal boilerplate to reach the real title", () => {
		const text = "Submitted 1/20; Revised 6/20; Published 6/20\n\nExploring the Limits of Transfer Learning\n\nColin Raffel∗\nGoogle";
		expect(deriveTitle(text)).toBe("Exploring the Limits of Transfer Learning");
	});
	it("skips arXiv stamps and page numbers", () => {
		const text = "1\narXiv:1706.03762v7\nAttention Is All You Need\nAshish Vaswani∗";
		expect(deriveTitle(text)).toBe("Attention Is All You Need");
	});
});

describe("chooseTitle", () => {
	it("prefers a clean embedded title", () => {
		expect(chooseTitle("Deep Residual Learning for Image Recognition", "irrelevant text", "/x/resnet.pdf")).toBe("Deep Residual Learning for Image Recognition");
	});
	it("ignores a junk embedded title and falls back to the text heuristic", () => {
		const text = "Distributed Representations of Words and Phrases\n\nTomas Mikolov\nGoogle";
		expect(chooseTitle("countries.capitals.projections.eps", text, "/x/word2vec.pdf")).toBe("Distributed Representations of Words and Phrases");
	});
	it("falls back to the filename when nothing usable is found", () => {
		expect(chooseTitle(" ", "1\n2\n3\n", "/x/some-paper.pdf")).toBe("some paper");
	});
});
