
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Send } from "lucide-react";

const contactFormSchema = z.object({
  nombreCompleto: z.string().min(3, {
    message: "El nombre completo debe tener al menos 3 caracteres.",
  }),
  email: z.string().email({
    message: "Por favor, introduce un correo electrónico válido.",
  }),
  asunto: z.enum(["consulta", "problema_tecnico", "feedback", "otro"], {
    required_error: "Debes seleccionar un asunto.",
  }),
  mensaje: z.string().min(10, {
    message: "El mensaje debe tener al menos 10 caracteres.",
  }).max(1000, {
    message: "El mensaje no puede exceder los 1000 caracteres."
  }),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export default function ContactPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      nombreCompleto: "",
      email: "",
      asunto: undefined,
      mensaje: "",
    },
  });

  async function onSubmit(values: ContactFormValues) {
    setIsSubmitting(true);
    console.log("Datos del formulario de contacto:", values);

    // Simular envío
    await new Promise((resolve) => setTimeout(resolve, 1500));

    toast({
      title: "Mensaje Enviado Correctamente",
      description: "Gracias por contactarnos. Te responderemos pronto.",
    });
    form.reset();
    setIsSubmitting(false);
    // TODO: En el futuro, aquí se llamaría a una Server Action o API para enviar el mensaje.
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 md:p-8 bg-background text-foreground">
      <Card className="w-full max-w-xl shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">Contáctanos</CardTitle>
          <CardDescription className="text-muted-foreground pt-2">
            ¿Tienes alguna pregunta o comentario? Nos encantaría escucharte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="nombreCompleto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Tu nombre completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="tu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="asunto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asunto</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un asunto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="consulta">Consulta General</SelectItem>
                        <SelectItem value="problema_tecnico">Problema Técnico</SelectItem>
                        <SelectItem value="feedback">Feedback sobre el Sitio</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mensaje"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mensaje</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Escribe tu mensaje aquí..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {isSubmitting ? "Enviando..." : "Enviar Mensaje"}
              </Button>
            </form>
          </Form>
        </CardContent>
         <CardFooter className="flex-col items-center gap-2 pt-6">
            <p className="text-xs text-muted-foreground">
              También puedes{" "}
              <Link href="/" className="font-medium text-primary hover:underline">
                volver al inicio
              </Link>
              .
            </p>
          </CardFooter>
      </Card>
    </main>
  );
}
