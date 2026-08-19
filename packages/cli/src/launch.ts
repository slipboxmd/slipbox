import slipbox, { skillsDir } from "@slipbox/core";
import {
	createAgentSessionFromServices,
	createAgentSessionRuntime,
	createAgentSessionServices,
	getAgentDir,
	InteractiveMode,
	SessionManager,
	type CreateAgentSessionRuntimeFactory,
} from "@earendil-works/pi-coding-agent";

/**
 * Launch the branded Slipbox harness: the Pi interactive TUI preloaded with the
 * @slipbox/core extension + skill, reusing the user's existing Pi login, models,
 * and settings via the shared agent dir (~/.pi/agent).
 */
export async function launch(options: { resume?: boolean } = {}): Promise<void> {
	const cwd = process.cwd();

	const createRuntime: CreateAgentSessionRuntimeFactory = async ({ cwd, agentDir, sessionManager, sessionStartEvent }) => {
		const services = await createAgentSessionServices({
			cwd,
			agentDir,
			resourceLoaderOptions: {
				// Inject our extension (its default export is the factory) and skill.
				extensionFactories: [{ name: "slipbox", factory: slipbox }],
				additionalSkillPaths: [skillsDir],
			},
		});
		const created = await createAgentSessionFromServices({ services, sessionManager, sessionStartEvent });
		return { ...created, services, diagnostics: services.diagnostics };
	};

	const runtime = await createAgentSessionRuntime(createRuntime, {
		cwd,
		agentDir: getAgentDir(), // ~/.pi/agent — reuses existing login + model settings
		// continueRecent reopens the most recent session for this cwd (starting a
		// fresh one if none exists); create always starts a new session.
		sessionManager: options.resume ? SessionManager.continueRecent(cwd) : SessionManager.create(cwd),
	});

	const mode = new InteractiveMode(runtime, {
		modelFallbackMessage: runtime.modelFallbackMessage,
	});
	await mode.run();
}
