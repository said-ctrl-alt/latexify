package com.mycompany.definitiva;
import java.util.Scanner;
public class Definitiva {
    public static void main(String[] args) {
      double n1, n2, n3, definitiva;
      Scanner notas = new Scanner(System.in);
      System.out.print("Digite la nota 1: ");
      n1 = notas.nextDouble();
      System.out.print("Digite la nota 2: ");
      n2 = notas.nextDouble();
      System.out.print("Digite la nota 3: ");
      n3 = notas.nextDouble();
      definitiva =(n1 * 0.30)+(n2*.35)+(n3*.35);
      if (definitiva>=3){
          System.out.println("Su definitiva es: "+definitiva);
          System.out.print("Gana la materia");
      }
      else {
          System.out.println("Su definitiva es: "+definitiva);
          System.out.println("Pierde la materia");
      }
    }
}
