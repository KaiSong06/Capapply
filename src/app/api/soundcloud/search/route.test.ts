import { beforeEach, describe, expect, it, vi } from "vitest";
import { searchSoundCloudTracks } from "../../../../lib/adapters/soundcloud";
import { readEnv } from "../../../../lib/config/env";
import { GET } from "./route";

vi.mock("../../../../lib/adapters/soundcloud", () => ({
  searchSoundCloudTracks: vi.fn(),
}));

vi.mock("../../../../lib/config/env", () => ({
  readEnv: vi.fn(),
}));

const searchSoundCloudTracksMock = vi.mocked(searchSoundCloudTracks);
const readEnvMock = vi.mocked(readEnv);

function callRoute(query = "pop") {
  return GET(new Request(`http://localhost/api/soundcloud/search?q=${query}`));
}

describe("SoundCloud search route", () => {
  beforeEach(() => {
    searchSoundCloudTracksMock.mockReset();
    readEnvMock.mockReset();
    readEnvMock.mockReturnValue({
      ARTIFACT_ROOT: "var/capapply",
      MEDIA_PROVIDER_MODE: "mock",
      RAPIDAPI_KEY: "test-key",
      SOUNDCLOUD_SEARCH_URL: "https://soundcloud-scraper.p.rapidapi.com/v1/search/tracks",
      SOUNDCLOUD_RAPIDAPI_HOST: "soundcloud-scraper.p.rapidapi.com",
    });
  });

  it("returns tracks from SoundCloud search", async () => {
    const tracks = [
      {
        id: "1",
        title: "Track 1",
        artist: "Artist",
        durationMs: 123,
        artworkUrl: null,
        sourceUrl: "https://soundcloud.com/artist/track-1",
        processability: { processable: true, reason: "downloadable", audioUrl: "https://audio.test/1" },
      },
    ];
    searchSoundCloudTracksMock.mockResolvedValue(tracks);

    const response = await callRoute("pop");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ tracks });
    expect(searchSoundCloudTracksMock).toHaveBeenCalledWith({
      query: "pop",
      searchUrl: "https://soundcloud-scraper.p.rapidapi.com/v1/search/tracks",
      rapidApiKey: "test-key",
      rapidApiHost: "soundcloud-scraper.p.rapidapi.com",
    });
  });

  it("returns 502 when SoundCloud search fails", async () => {
    searchSoundCloudTracksMock.mockRejectedValue(new Error("provider unavailable"));

    const response = await callRoute("pop");

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "Unable to search SoundCloud" });
  });

  it("returns 502 when environment parsing fails", async () => {
    readEnvMock.mockImplementation(() => {
      throw new Error("invalid environment");
    });

    const response = await callRoute("pop");

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "Unable to search SoundCloud" });
    expect(searchSoundCloudTracksMock).not.toHaveBeenCalled();
  });
});
