import { describe, expect, it, vi } from "vitest";
import fixture from "../../test/fixtures/soundcloud-search.json";
import { normalizeSoundCloudSearch, searchSoundCloudTracks } from "./soundcloud";

describe("soundcloud adapter", () => {
  it("marks downloadable tracks as processable and stream-only tracks as disabled", () => {
    const tracks = normalizeSoundCloudSearch(fixture);

    expect(tracks[0]?.processability).toEqual({
      processable: true,
      reason: "downloadable",
      audioUrl: "https://api.soundcloud.com/tracks/1/download",
    });
    expect(tracks[1]?.processability).toEqual({
      processable: false,
      reason: "not_permitted",
      audioUrl: null,
    });
  });

  it("calls the configured RapidAPI search endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fixture,
    });

    await searchSoundCloudTracks({
      query: "pop",
      searchUrl: "https://soundcloud-scraper.p.rapidapi.com/v1/search/tracks",
      rapidApiKey: "test-key",
      rapidApiHost: "soundcloud-scraper.p.rapidapi.com",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("q=pop");
    expect(init.headers["x-rapidapi-key"]).toBe("test-key");
    expect(init.headers["x-rapidapi-host"]).toBe("soundcloud-scraper.p.rapidapi.com");
  });
});
