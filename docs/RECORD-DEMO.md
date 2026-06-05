# Recording the demo GIF

The README hero currently shows a static terminal block. Replace it with a short
animated GIF (~10–15s) of a real run — the failing-gate output is the money shot.

## Easiest path: [VHS](https://github.com/charmbracelet/vhs) (scripted, reproducible)

VHS renders a `.tape` script straight to a GIF — no screen recording, pixel-perfect, re-runnable when the UI changes.

1. Install VHS (`brew install vhs`, or see the repo for Windows/Linux).
2. Save this as `docs/demo.tape`:

   ```tape
   Output docs/demo.gif
   Set FontSize 18
   Set Width 1100
   Set Height 640
   Set Theme "Catppuccin Mocha"

   Type "npm run demo"
   Enter
   Sleep 3s

   # Break an assertion to show the gate catching a regression
   Type "# now a prompt regression slips in..."
   Enter
   Sleep 1s
   ```

3. Run `vhs docs/demo.tape` → produces `docs/demo.gif`.
4. In `README.md`, replace the `<!-- TODO -->` comment + the ```text block with:

   ```markdown
   ![PromptGuard catching a prompt regression in CI](docs/demo.gif)
   ```

## Alternative: asciinema + agg

- `asciinema rec demo.cast` → run the commands → `Ctrl-D`.
- `agg demo.cast docs/demo.gif` to convert to GIF.

## What to show (keep it under 15s)

1. `npm run demo` → **PASS** (the happy path).
2. Edit one assertion so a case regresses.
3. `npm run demo` → **FAIL**, with the exact broken assertion + the "quality regressed vs baseline" line.

That three-beat story — green, edit, red — is the whole pitch in ten seconds.
