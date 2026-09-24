// prisma/menu-data.ts — menú real de Dolce Florencia (fuente: menú impreso, 5 páginas).
// Precios en centavos de Bs (Bs 12 = 1200). null = consultar. El seed.ts recorre esto con upsert por nombre.
// OJO: las "tortas ricas" (Bs 18) son porciones de salón, no tortas enteras. Las tortas enteras/personalizadas se cotizan por WhatsApp.

export const menu = [
  {
    "categoria": "Cafés calientes",
    "orden": 0,
    "productos": [
      {
        "nombre": "Espresso",
        "descripcion": null,
        "precioCentavos": 1200,
        "orden": 0
      },
      {
        "nombre": "Espresso doble",
        "descripcion": null,
        "precioCentavos": 1500,
        "orden": 1
      },
      {
        "nombre": "Americano",
        "descripcion": null,
        "precioCentavos": 1300,
        "orden": 2
      },
      {
        "nombre": "Americano doble",
        "descripcion": null,
        "precioCentavos": 1600,
        "orden": 3
      },
      {
        "nombre": "Cortado",
        "descripcion": null,
        "precioCentavos": 1400,
        "orden": 4
      },
      {
        "nombre": "Cortado doble",
        "descripcion": null,
        "precioCentavos": 1700,
        "orden": 5
      },
      {
        "nombre": "Macchiato",
        "descripcion": null,
        "precioCentavos": 1400,
        "orden": 6
      },
      {
        "nombre": "Macchiato doble",
        "descripcion": null,
        "precioCentavos": 1700,
        "orden": 7
      },
      {
        "nombre": "Capuccino",
        "descripcion": null,
        "precioCentavos": 1600,
        "orden": 8
      },
      {
        "nombre": "Capuccino doble",
        "descripcion": null,
        "precioCentavos": 1900,
        "orden": 9
      },
      {
        "nombre": "Flat white",
        "descripcion": null,
        "precioCentavos": 2000,
        "orden": 10
      },
      {
        "nombre": "Latte",
        "descripcion": null,
        "precioCentavos": 2000,
        "orden": 11
      }
    ]
  },
  {
    "categoria": "Cafés especiales",
    "orden": 1,
    "productos": [
      {
        "nombre": "Café moca",
        "descripcion": "Espresso doble, leche texturizada, crema de leche, syrope de chocolate, chocolate rallado",
        "precioCentavos": 2200,
        "orden": 0
      },
      {
        "nombre": "Café Florencia",
        "descripcion": "Espresso doble, leche texturizada, borde de brigadeiro, crema de leche, canela",
        "precioCentavos": 2200,
        "orden": 1
      },
      {
        "nombre": "Café boliviano",
        "descripcion": "Espresso doble, leche texturizada, borde de dulce de leche, chancaca, crema de leche",
        "precioCentavos": 2300,
        "orden": 2
      },
      {
        "nombre": "Doble doble",
        "descripcion": "Café canadiense, espresso doble, leche texturizada, doble crema de leche y jarabe de maple",
        "precioCentavos": 2400,
        "orden": 3
      }
    ]
  },
  {
    "categoria": "Cafés fríos",
    "orden": 2,
    "productos": [
      {
        "nombre": "Ice latte",
        "descripcion": "Espresso doble y leche servido sobre hielo, coronada con crema batida",
        "precioCentavos": 1900,
        "orden": 0
      },
      {
        "nombre": "Frappuccino",
        "descripcion": "Granizado de café y leche con una bola de helado de vainilla y crema batida",
        "precioCentavos": 2400,
        "orden": 1
      },
      {
        "nombre": "Dolce Florencia Signature",
        "descripcion": "Espresso doble frío, leche condensada, mini brownies picados encima y doble crema con dulce de leche",
        "precioCentavos": 3000,
        "orden": 2
      },
      {
        "nombre": "Florencia Cream Latte",
        "descripcion": "Espresso doble frío, leche condensada cremosa y hielo",
        "precioCentavos": 2500,
        "orden": 3
      },
      {
        "nombre": "Canela Dolce Iced Coffee",
        "descripcion": "Espresso doble frío, leche evaporada y un toque de canela aromática",
        "precioCentavos": 2500,
        "orden": 4
      },
      {
        "nombre": "Amor Caramelo Florentino",
        "descripcion": "Espresso doble frío, leche condensada, crema y caramelo",
        "precioCentavos": 2500,
        "orden": 5
      }
    ]
  },
  {
    "categoria": "Extras",
    "orden": 3,
    "productos": [
      {
        "nombre": "Crema de leche",
        "descripcion": null,
        "precioCentavos": 400,
        "orden": 0
      },
      {
        "nombre": "Syrope de chocolate",
        "descripcion": null,
        "precioCentavos": 400,
        "orden": 1
      },
      {
        "nombre": "Canela",
        "descripcion": null,
        "precioCentavos": 200,
        "orden": 2
      },
      {
        "nombre": "Chocolate rallado",
        "descripcion": null,
        "precioCentavos": 200,
        "orden": 3
      }
    ]
  },
  {
    "categoria": "Matchas calientes",
    "orden": 4,
    "productos": [
      {
        "nombre": "Usucha matcha",
        "descripcion": "Una matcha ligera con espuma sedosa y vibrante",
        "precioCentavos": 1500,
        "orden": 0
      },
      {
        "nombre": "Koicha matcha",
        "descripcion": "Una matcha intensa, densa y de sabor profundo",
        "precioCentavos": 1700,
        "orden": 1
      },
      {
        "nombre": "Matcha con leche",
        "descripcion": "Koicha matcha y leche caliente",
        "precioCentavos": 2200,
        "orden": 2
      },
      {
        "nombre": "Matcha latte",
        "descripcion": "Koicha matcha y leche texturizada",
        "precioCentavos": 2200,
        "orden": 3
      }
    ]
  },
  {
    "categoria": "Matchas especiales",
    "orden": 5,
    "productos": [
      {
        "nombre": "Honey matcha latte",
        "descripcion": "Koicha matcha, leche texturizada, miel natural",
        "precioCentavos": 2400,
        "orden": 0
      },
      {
        "nombre": "Moca matcha latte",
        "descripcion": "Koicha matcha, leche texturizada, syrope de chocolate",
        "precioCentavos": 2400,
        "orden": 1
      },
      {
        "nombre": "Dirty matcha",
        "descripcion": "Koicha matcha, leche texturizada, doble espresso",
        "precioCentavos": 2700,
        "orden": 2
      }
    ]
  },
  {
    "categoria": "Matchas fríos",
    "orden": 6,
    "productos": [
      {
        "nombre": "Berry Kyoto",
        "descripcion": "Koicha matcha frío cremoso con leche, hielo y una capa de jalea artesanal de frutos rojos en el fondo",
        "precioCentavos": 2200,
        "orden": 0
      },
      {
        "nombre": "Florencia Pink Matcha",
        "descripcion": "Koicha matcha frío con jalea de frutos rojos, decorado con crema y frutillas",
        "precioCentavos": 2400,
        "orden": 1
      },
      {
        "nombre": "Matcha Velvet",
        "descripcion": "Koicha matcha frío con leche condensada en el fondo, decorado con crema de leche y remolino de salsa de frutos rojos",
        "precioCentavos": 2400,
        "orden": 2
      },
      {
        "nombre": "Matcha Chancaca Ice",
        "descripcion": "Koicha matcha frío con chancaca semi derretida en el fondo, crema de leche, chancaca en cubitos y canela",
        "precioCentavos": 2700,
        "orden": 3
      }
    ]
  },
  {
    "categoria": "Masitas cambas",
    "orden": 7,
    "productos": [
      {
        "nombre": "Cuñapé",
        "descripcion": null,
        "precioCentavos": 600,
        "orden": 0
      },
      {
        "nombre": "Sonso",
        "descripcion": null,
        "precioCentavos": 1000,
        "orden": 1
      },
      {
        "nombre": "Arepas cambas",
        "descripcion": null,
        "precioCentavos": 1000,
        "orden": 2
      }
    ]
  },
  {
    "categoria": "Paninis artesanales",
    "orden": 8,
    "productos": [
      {
        "nombre": "Panini de queso",
        "descripcion": "Panini crujiente de queso mozzarella y queso criollo",
        "precioCentavos": 1800,
        "orden": 0
      },
      {
        "nombre": "Panini de cheddar y tocino",
        "descripcion": "Relleno de queso cheddar, queso criollo y tocino, bañado con queso por encima",
        "precioCentavos": 2000,
        "orden": 1
      },
      {
        "nombre": "Panini de cheddar y jamón",
        "descripcion": "Panini crujiente de queso mozzarella, criollo y jamón bañado con queso por encima",
        "precioCentavos": 1800,
        "orden": 2
      }
    ]
  },
  {
    "categoria": "Croissants salados",
    "orden": 9,
    "productos": [
      {
        "nombre": "Croissant de quesos",
        "descripcion": "A la plancha con queso mozzarella y queso caiseño",
        "precioCentavos": 1800,
        "orden": 0
      },
      {
        "nombre": "Croissant de jamón y queso",
        "descripcion": "Crocante, jamón y queso derretido por dentro y por fuera",
        "precioCentavos": 2000,
        "orden": 1
      },
      {
        "nombre": "Croissant de tocino y queso",
        "descripcion": "Crocante, tocino ahumado y queso derretido por dentro y por fuera",
        "precioCentavos": 2000,
        "orden": 2
      },
      {
        "nombre": "Croissant brunch clásico",
        "descripcion": "Con revuelto de huevos, queso criollo rallado y tocino crujiente",
        "precioCentavos": 2200,
        "orden": 3
      }
    ]
  },
  {
    "categoria": "Croissants dulces",
    "orden": 10,
    "productos": [
      {
        "nombre": "Frutos rojos y crema",
        "descripcion": "Relleno con mermelada artesanal de frutos rojos y crema batida fresca",
        "precioCentavos": 2200,
        "orden": 0
      },
      {
        "nombre": "Croissant Passion",
        "descripcion": "Relleno con dulce de leche",
        "precioCentavos": 1800,
        "orden": 1
      },
      {
        "nombre": "Croissant Florencia",
        "descripcion": "Relleno de ganache de chocolate, cubitos de brownie y decorado con chocolate derretido",
        "precioCentavos": 2200,
        "orden": 2
      }
    ]
  },
  {
    "categoria": "Tortas ricas",
    "orden": 11,
    "productos": [
      {
        "nombre": "Torta crepe de frutos rojos",
        "descripcion": "Suaves crepes rellenos de crema ligera con el toque vibrante del bosque",
        "precioCentavos": 1800,
        "orden": 0
      },
      {
        "nombre": "Torta crepe de chocolate",
        "descripcion": "Suaves crepes de cacao rellenos de crema trufada con el toque intenso del chocolate",
        "precioCentavos": 1800,
        "orden": 1
      },
      {
        "nombre": "Torta crepe de maracuyá",
        "descripcion": "Suaves crepes rellenos de crema cítrica con el toque tropical del maracuyá",
        "precioCentavos": 1800,
        "orden": 2
      },
      {
        "nombre": "Torta premium de chocolate",
        "descripcion": "Viene con una mini jarrita de chocolate puro derretido para agregarle a su porción",
        "precioCentavos": 3000,
        "orden": 3
      }
    ]
  },
  {
    "categoria": "Postres deliciosos",
    "orden": 12,
    "productos": [
      {
        "nombre": "Pavlova en vaso",
        "descripcion": "Merengue crujiente y suave, relleno de dulce de leche, crema batida y frutos rojos",
        "precioCentavos": 1500,
        "orden": 0
      },
      {
        "nombre": "Brownie extra chocolatoso",
        "descripcion": "Bizcocho húmedo y denso de puro chocolate con costra crujiente encima",
        "precioCentavos": 1200,
        "orden": 1
      },
      {
        "nombre": "Nanaimo bar",
        "descripcion": "Base crocante de coco y cacao, relleno de crema suave y cobertura de chocolate",
        "precioCentavos": 1500,
        "orden": 2
      },
      {
        "nombre": "Postres virales de TikTok",
        "descripcion": "Frambuesa, grano de café y mango. Preguntar por disponibilidad",
        "precioCentavos": 2500,
        "orden": 3
      }
    ]
  },
  {
    "categoria": "Cheesecakes signature",
    "orden": 13,
    "productos": [
      {
        "nombre": "Nueva York de frutos rojos",
        "descripcion": "Cheesecake horneado, suave y cremoso sobre una base crujiente de galleta, cubierto con una reducción artesanal de frutos rojos",
        "precioCentavos": 2500,
        "orden": 0
      }
    ]
  },
  {
    "categoria": "Postres keto",
    "orden": 14,
    "productos": [
      {
        "nombre": "Postre keto del día",
        "descripcion": "Preguntar por el postre keto del día",
        "precioCentavos": null,
        "orden": 0
      }
    ]
  },
  {
    "categoria": "Jugos y refrescos",
    "orden": 15,
    "productos": [
      {
        "nombre": "Jugo de fruta de estación (vaso)",
        "descripcion": "Preguntar por la fruta de estación",
        "precioCentavos": 1000,
        "orden": 0
      },
      {
        "nombre": "Jugo de fruta de estación (jarra)",
        "descripcion": "Preguntar por la fruta de estación",
        "precioCentavos": 2500,
        "orden": 1
      },
      {
        "nombre": "Coca Cola 300 ml",
        "descripcion": null,
        "precioCentavos": 500,
        "orden": 2
      }
    ]
  },
  {
    "categoria": "Bebidas calientes",
    "orden": 16,
    "productos": [
      {
        "nombre": "Mates (anís, coca, cedrón, manzanilla, boldo, trimate)",
        "descripcion": null,
        "precioCentavos": 500,
        "orden": 0
      },
      {
        "nombre": "Submarino",
        "descripcion": null,
        "precioCentavos": 1500,
        "orden": 1
      }
    ]
  }
] as const;
