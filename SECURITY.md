# Security policy

Version 0.1.0 is an experimental prototype. It is not production hardened.

- The local server binds to `127.0.0.1` by default.
- Nonlocal listening requires `BLUEBERRY_TOKEN`; this is a shared token, not per-user authentication.
- Remote operation requires an external TLS reverse proxy, appropriate OAuth / identity gateway, rate limiting and user isolation.
- Sessions live in server memory and are neither encrypted at rest nor persisted after restart.
- Avoid entering patient records, secrets, or proprietary business data into any untrusted deployment.
- Browser media encoding and FFmpeg conversion consume CPU and memory; remote conversion is disabled unless explicitly enabled.
- Please report security issues privately to the maintainers once the repository has a defined owner and security contact.
