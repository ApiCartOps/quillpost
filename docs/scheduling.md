# Scheduling and drafts

## Drafts

A draft is a saved post that has not been published. Drafts live in `~/.quillpost/drafts.json`.

```bash
quillpost draft save --style=story --hook="..." --item="..." --item="..."
quillpost draft list
quillpost draft show a1b2c3          # build and check it, publish nothing
quillpost draft publish a1b2c3       # publishes, then removes the draft
quillpost draft delete a1b2c3
```

## The schedule is a local queue

LinkedIn's API has **no native scheduling**. Quillpost keeps a queue on your machine and publishes due posts when you run it. A post only goes out if something is running `quillpost` at or after the scheduled time.

```bash
quillpost schedule add --at="2026-10-23 09:00" --text-file=post.txt
quillpost schedule add --at=+2h --style=news --hook="..." --item="..."
quillpost schedule list
quillpost schedule cancel a1b2c3
quillpost schedule run                # publish everything that is due, once, then exit
quillpost schedule watch --every=60   # keep running and check every 60 seconds
```

`--at` accepts a local time like `"2026-10-23 09:00"`, an ISO time with an offset, or relative `+30m`, `+2h`, `+1d`.

Posts are checked when you add them, so mistakes show up now, not at 09:00. A post that fails when it runs (for example an expired token) stays in the queue as `failed` with the error; fix the cause, then cancel and re-add it. A published item is never run twice.

## Running it automatically

Pick whichever fits your machine. Each runs `schedule run` regularly; the queue decides what is due.

**Windows (Task Scheduler):** every 5 minutes.

```powershell
schtasks /Create /SC MINUTE /MO 5 /TN "Quillpost schedule" /TR "cmd /c quillpost schedule run"
```

**macOS or Linux (cron):**

```cron
*/5 * * * * quillpost schedule run >> ~/.quillpost/schedule.log 2>&1
```

**macOS (launchd)** works the same way with a `StartInterval` of 300.

**Or** leave `quillpost schedule watch` running in a terminal, tmux session or service.

If the machine is asleep at the scheduled time, the post goes out the next time the runner wakes, not at the exact minute.

## Cloud routines cannot publish for you

A cloud-hosted scheduled agent cannot reach this tool, because your token lives on your machine. Let such a routine **draft** the post (for example in a `news` style) and publish it yourself, or save its output as a Quillpost draft.

## From an AI agent

`quillpost_schedule_add` queues a post and, like every publishing tool, needs `approved: true` after you approve the text and time. `quillpost_schedule_run_due` also needs approval.
