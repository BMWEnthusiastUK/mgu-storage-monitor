# v1.2.3 candidate — not yet tested on a vehicle

- Use the first successfully read filesystem when the primary lookup fails.
- Run filesystem checks asynchronously, with 2.5-second command timeouts.
- Prevent overlapping refresh operations and avoid rendering after the screen is hidden.
- Add regression tests for fallback, deduplication, and complete lookup failure.

Tested locally with Node.js; BMW MGU runtime compatibility is not yet verified. Do not publish as a confirmed working release until tested in the car.
