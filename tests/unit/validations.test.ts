import { loginSchema, registerSchema } from "@/lib/validations"

describe("loginSchema", () => {
  it("passes with valid email and password", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "secret123" })
    expect(result.success).toBe(true)
  })

  it("fails with invalid email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "secret123" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Invalid email address")
    }
  })

  it("fails with empty password", () => {
    const result = loginSchema.safeParse({ email: "user@example.com", password: "" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Password is required")
    }
  })

  it("fails with missing email", () => {
    const result = loginSchema.safeParse({ password: "secret123" })
    expect(result.success).toBe(false)
  })
})

describe("registerSchema", () => {
  it("passes with valid name, email, and strong password", () => {
    const result = registerSchema.safeParse({
      name: "Vishal",
      email: "vishal@example.com",
      password: "Password1",
    })
    expect(result.success).toBe(true)
  })

  it("fails when name is too short (1 char)", () => {
    const result = registerSchema.safeParse({
      name: "V",
      email: "vishal@example.com",
      password: "Password1",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/at least 2 characters/)
    }
  })

  it("fails when password has no uppercase letter", () => {
    const result = registerSchema.safeParse({
      name: "Vishal",
      email: "vishal@example.com",
      password: "password1",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/uppercase/)
    }
  })

  it("fails when password has no number", () => {
    const result = registerSchema.safeParse({
      name: "Vishal",
      email: "vishal@example.com",
      password: "PasswordOnly",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/number/)
    }
  })

  it("fails when password is too short (< 8 chars)", () => {
    const result = registerSchema.safeParse({
      name: "Vishal",
      email: "vishal@example.com",
      password: "P1x",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/at least 8 characters/)
    }
  })

  it("fails with invalid email", () => {
    const result = registerSchema.safeParse({
      name: "Vishal",
      email: "bad-email",
      password: "Password1",
    })
    expect(result.success).toBe(false)
  })
})
