import { describe, expect, it } from "vitest";
import { resolveLaunchOptions } from "./options.js";

describe("resolveLaunchOptions", () => {
	it("defaults both flags to false with no args", () => {
		expect(resolveLaunchOptions([])).toEqual({ resume: false, yolo: false });
	});

	it("sets resume when --resume is present", () => {
		expect(resolveLaunchOptions(["--resume"])).toEqual({ resume: true, yolo: false });
	});

	it("sets yolo when --yolo is present", () => {
		expect(resolveLaunchOptions(["--yolo"])).toEqual({ resume: false, yolo: true });
	});

	it("sets both when --resume and --yolo are present", () => {
		expect(resolveLaunchOptions(["--resume", "--yolo"])).toEqual({ resume: true, yolo: true });
	});
});
