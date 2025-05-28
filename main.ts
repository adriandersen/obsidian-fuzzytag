import {
	App,
	Editor,
	EditorPosition,
	EditorSuggest,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
} from "obsidian";

const fuzzysort = require("fuzzysort");

interface PluginSettings {
	matchColor: string;
	quotation: boolean;
}
const DEFAULT_SETTINGS: PluginSettings = {
	matchColor: "#ff2200",
	quotation: false,
};

export default class FrontmatterFuzzyTagPlugin extends Plugin {
	settings: PluginSettings;
	async onload() {
		await this.loadSettings();
		this.registerEditorSuggest(new FuzzyTag(this));
		this.addSettingTab(new FuzzyTagSettingsTab(this.app, this));
	}
	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class FuzzyTag extends EditorSuggest<string> {
	plugin: FrontmatterFuzzyTagPlugin;
	tags: (string | undefined)[];

	constructor(plugin: FrontmatterFuzzyTagPlugin) {
		super(plugin.app);
		this.plugin = plugin;
	}

	getAllTagsWithoutHashtag(): (string | undefined)[] {
		//@ts-expect-error, private method
		const tags: any = this.plugin.app.metadataCache.getTags();
		return [...Object.keys(tags)].map((p) => p.split("#").pop());
	}
	inRange(range: string) {
		if (!range || !range.length) return false;
		if (range.match(/^---\n/gm)?.length != 1) return false;
		if (!/^tags?:/gm.test(range)) return false;
		const split = range.split(/(^\w+:?\s*\n?)/gm);
		for (let i = split.length - 1; i >= 0; i--) {
			if (/(^\w+:?\s*\n?)/gm.test(split[i]))
				return split[i].startsWith("tags:");
		}
		return false;
	}
	inline = false;
	usesQuotationmarks = false;
	onTrigger(
		cursor: EditorPosition,
		editor: Editor,
		_: TFile
	): EditorSuggestTriggerInfo | null {
		const lineContents = editor.getLine(cursor.line).toLowerCase();
		const onFrontmatterTagLine =
			lineContents.startsWith("tags:") ||
			lineContents.startsWith("tag:") ||
			this.inRange(editor.getRange({ line: 0, ch: 0 }, cursor));
		if (onFrontmatterTagLine) {
			this.inline =
				lineContents.startsWith("tags:") ||
				lineContents.startsWith("tag:");
			this.usesQuotationmarks = lineContents.includes('"');
			const sub = editor.getLine(cursor.line).substring(0, cursor.ch);

			const match = sub
				.match(/\"?(\S+)\"?$/)
				?.first()
				?.replace('"', "");
			if (match) {
				this.tags = this.getAllTagsWithoutHashtag();
				const matchData = {
					end: cursor,
					start: {
						ch: sub.lastIndexOf(match),
						line: cursor.line,
					},
					query: match,
				};
				return matchData;
			}
		}
		return null;
	}

	getSuggestions(context: EditorSuggestContext): string[] {
		// const suggestions = this.tags.filter((p) =>
		// 	p.toLowerCase().contains(context.query.toLowerCase())
		// );
		const suggestions = fuzzysort.go(
			context.query.toLowerCase(),
			this.tags,
			{
				all: true,
			}
		);

		return suggestions.map((p: any) =>
			fuzzysort.highlight(
				p,
				`<span style="color: ${this.plugin.settings.matchColor}"><b>`,
				"</b></span>"
			)
		);
	}

	renderSuggestion(suggestion: string, el: HTMLElement): void {
		const outer = el.createDiv({ cls: "ES-suggester-container" });
		outer.createDiv({ cls: "ES-tags" }).innerHTML = `#${suggestion}`;
	}

	selectSuggestion(suggestion: string): void {
		if (this.context) {
			if (this.plugin.settings.quotation) {
				suggestion = `"${suggestion}"`;
			}
			if (this.inline) {
				suggestion = `${suggestion},`;
			}
			(this.context.editor as Editor).replaceRange(
				//This might break if you use special characters in your tags
				`${suggestion.replace(/<\/?[^>]+(>|$)/g, "")}`,
				this.context.start,
				this.context.end
			);
			this.close();
		}
	}
}

class FuzzyTagSettingsTab extends PluginSettingTab {
	plugin: FrontmatterFuzzyTagPlugin;

	constructor(app: App, plugin: FrontmatterFuzzyTagPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Fuzzy tag autocomplete settings" });

		new Setting(containerEl)
			.setName("Fuzzy match color")
			.setDesc(
				"What color to display on matched letters in the fuzzy match"
			)
			.addText((text) =>
				text
					.setPlaceholder("#ff9900")
					.setValue(this.plugin.settings.matchColor)
					.onChange(async (value) => {
						this.plugin.settings.matchColor = value;
						await this.plugin.saveSettings();
					})
			);
		new Setting(containerEl)
			.setName("Use Quotation marks")
			.setDesc("Use quotation marks for tags (experimental)")
			.addToggle((toggle) => {
				toggle.setValue(false).onChange(async (val) => {
					this.plugin.settings.quotation = val;
					await this.plugin.saveSettings();
				});
			});
	}
}
