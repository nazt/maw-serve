import { expect, test } from "bun:test";

import {
  apiUrl,
  peopleApiUrl,
  privateNetworkAddressSpace,
  resolveHost,
  resolvePeopleHost,
  shouldOfferHostConnection,
} from "../web/src/clients/api";

test("host resolution prefers URL, then saved host, then same-origin", () => {
  expect(resolveHost({
    hasUrlHost: true,
    urlHost: "http://127.0.0.1:48900/",
    savedHost: "https://saved.example",
  })).toBe("http://127.0.0.1:48900");
  expect(resolveHost({
    hasUrlHost: false,
    urlHost: null,
    savedHost: "saved.example:3456",
  })).toBe("https://saved.example:3456");
  expect(resolveHost({ hasUrlHost: false, urlHost: null, savedHost: null })).toBe("");
  expect(resolveHost({
    hasUrlHost: true,
    urlHost: "",
    savedHost: "https://saved.example",
  })).toBe("");
});

test("peopleHost is explicit, origin-only, and never falls back to saved fleet state", () => {
  expect(resolvePeopleHost({ hasUrlHost: true, urlHost: "http://localhost:47911/path" }))
    .toBe("http://localhost:47911");
  expect(resolvePeopleHost({ hasUrlHost: true, urlHost: "http://127.0.0.1:47911" }))
    .toBe("http://127.0.0.1:47911");
  expect(resolvePeopleHost({ hasUrlHost: false, urlHost: "http://localhost:47911" }))
    .toBe("");
  expect(resolvePeopleHost({ hasUrlHost: true, urlHost: "https://people.example" }))
    .toBe("");
  expect(resolvePeopleHost({ hasUrlHost: true, urlHost: "http://192.168.1.20:47911" }))
    .toBe("");
  expect(resolvePeopleHost({ hasUrlHost: true, urlHost: "https://user:secret@example.test" }))
    .toBe("");
  expect(peopleApiUrl("/api/health", "http://127.0.0.1:47911"))
    .toBe("http://127.0.0.1:47911/api/health");
});

test("API paths remain relative locally and prefix the selected remote host", () => {
  expect(apiUrl("/api/agora/census", "")).toBe("/api/agora/census");
  expect(apiUrl("/api/agora/census", "http://127.0.0.1:48900"))
    .toBe("http://127.0.0.1:48900/api/agora/census");
});

test("PNA declares loopback separately from LAN address space", () => {
  expect(privateNetworkAddressSpace("http://localhost:48900/api/agora/census"))
    .toBe("loopback");
  expect(privateNetworkAddressSpace("http://127.0.0.1:48900/api/agora/census"))
    .toBe("loopback");
  expect(privateNetworkAddressSpace("http://192.168.1.20:48900/api/agora/census"))
    .toBe("local");
  expect(privateNetworkAddressSpace("https://fleet.example/api/agora/census"))
    .toBeNull();
});

test("connection help appears for hosted pages and explicitly selected failing hosts", () => {
  expect(shouldOfferHostConnection("http://127.0.0.1:48906", "http:")).toBeTrue();
  expect(shouldOfferHostConnection("", "https:")).toBeTrue();
  expect(shouldOfferHostConnection("", "http:")).toBeFalse();
});
