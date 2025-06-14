import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm", "cjs"],
	dts: {
		resolve: true,
		compilerOptions: {
			module: "ESNext",
			moduleResolution: "bundler",
		},
	},
	outDir: "dist",
	minify: true,
	splitting: false,
	sourcemap: false,
	clean: true,
	treeshake: true,
	target: "es2024",
	define: {
		"process.env.NODE_ENV": '"production"',
	},
	outExtension({ format }) {
		return {
			js: format === "cjs" ? ".cjs" : ".js",
			dts: ".d.ts",
		};
	},
});
