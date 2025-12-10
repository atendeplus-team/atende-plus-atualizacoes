import { z } from "zod";

// Validação para criação de usuários
export const createUserSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email é obrigatório")
    .email("Email inválido")
    .max(255, "Email muito longo"),
  password: z
    .string()
    .min(6, "Senha deve ter no mínimo 6 caracteres")
    .max(100, "Senha muito longa"),
  fullName: z
    .string()
    .trim()
    .min(1, "Nome completo é obrigatório")
    .max(100, "Nome muito longo"),
  company: z
    .string()
    .trim()
    .regex(/^\d+$/, "Guichê deve conter apenas números")
    .max(100, "Guichê muito longo")
    .optional(),
});

// Validação para criação de slides
export const createSlideSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Título é obrigatório")
    .max(255, "Título muito longo"),
  imageUrl: z
    .string()
    .trim()
    .url("URL inválida")
    .optional(),
  duration: z
    .number()
    .int("Duração deve ser um número inteiro")
    .min(3, "Duração mínima é 3 segundos")
    .max(60, "Duração máxima é 60 segundos"),
  mediaType: z.enum(['image', 'video']).optional(),
  transitionType: z.enum(['fade', 'slide', 'zoom', 'none']).optional(),
});

// Validação para criação de filas
export const createQueueSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome muito longo"),
  code: z
    .string()
    .trim()
    .min(1, "Código é obrigatório")
    .max(10, "Código muito longo")
    .regex(/^[A-Z0-9]+$/, "Código deve conter apenas letras maiúsculas e números"),
  description: z
    .string()
    .trim()
    .max(500, "Descrição muito longa")
    .optional(),
});

// Validação para URL de logo
export const logoUrlSchema = z.object({
  logoUrl: z
    .string()
    .trim()
    .url("URL inválida")
    .max(500, "URL muito longa"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateSlideInput = z.infer<typeof createSlideSchema>;
export type CreateQueueInput = z.infer<typeof createQueueSchema>;
export type LogoUrlInput = z.infer<typeof logoUrlSchema>;
