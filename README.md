# Fuzzytag

Forked and modified to change the behavior when a tag is selected.<br /><br />
Now the cursor will be placed at the end of the tag instead of on the next line after `-`.<br /><br />

---

Based on the Frontmatter Tag Suggest plugin
https://github.com/jmilldotdev/obsidian-frontmatter-tag-suggest

This plugin has been made because fuzzy search would change the functionality of the original plugin, which might not be desired by everyone.
Thanks to the original plugin developer for the inspiration and base for creating this plugin

![](screenshot.png)

## Known issues

Hacky implementation of highlighting in suggestions means that tags with special characters (`<` or `>`) might break. Feel free to submit a PR if this doesnt work with your workflow.
